import { Hono } from "hono";
import { and, eq, desc, sql, or, lt } from "drizzle-orm";
import { z } from "zod";
import { auditEvents as events } from "@sendfold/database/schema";
import { type Env, fail, json, fileAccess } from "../context";
import { audit } from "./record";
import { requireProjectAdmin } from "./access";
import { identityFilters, projectCountries, countryCondition } from "./filters";
import { visitorRoutes } from "./visitors";

export const auditRoutes = new Hono<Env>();
auditRoutes.route("/", visitorRoutes);
const filters = z.object({
  ...identityFilters,
  actor: z.string().max(120).optional(),
  action: z.string().max(80).optional(),
  search: z.string().max(120).default(""),
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().max(150).optional(),
});
const cursorSchema = z.object({
  at: z.number().int().nonnegative(),
  id: z.uuid(),
});

auditRoutes.get("/api/projects/:projectId/audit", async (c) => {
  const { project } = await requireProjectAdmin(c, c.req.param("projectId"));
  const input = filters.parse(c.req.query()),
    db = c.env.platform.db;
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (input.cursor) {
    try {
      cursor = cursorSchema.parse(JSON.parse(atob(input.cursor)));
    } catch {
      fail(400, "Invalid activity cursor.");
    }
  }
  const condition = and(
    eq(events.projectId, project.id),
    input.actor ? eq(events.actorKey, input.actor) : undefined,
    input.kind ? eq(events.actorKind, input.kind) : undefined,
    countryCondition(input.country),
    input.action ? eq(events.action, input.action) : undefined,
    input.from !== undefined
      ? sql`${events.createdAt} >= ${input.from}`
      : undefined,
    input.to !== undefined
      ? sql`${events.createdAt} <= ${input.to}`
      : undefined,
    input.search
      ? sql`instr(lower(${events.actorName} || ' ' || coalesce(${events.actorEmail}, '') || ' ' || coalesce(${events.ipAddress}, '') || ' ' || ${events.detail}), ${input.search.toLowerCase()}) > 0`
      : undefined,
  );
  const [rows, count, summary, actions, countries] = await Promise.all([
    db
      .select()
      .from(events)
      .where(
        and(
          condition,
          cursor
            ? or(
                lt(events.createdAt, cursor.at),
                and(eq(events.createdAt, cursor.at), lt(events.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(events.createdAt), desc(events.id))
      .limit(51)
      .all(),
    db
      .select({ total: sql<number>`count(*)` })
      .from(events)
      .where(condition)
      .get(),
    db
      .select({
        visitorCount: sql<number>`count(distinct ${events.actorKey})`,
        firstRecordedAt: sql<number | null>`min(${events.createdAt})`,
      })
      .from(events)
      .where(eq(events.projectId, project.id))
      .get(),
    db
      .selectDistinct({ action: events.action })
      .from(events)
      .where(eq(events.projectId, project.id))
      .orderBy(events.action)
      .all(),
    projectCountries(db, project.id),
  ]);
  const page = rows.slice(0, 50),
    last = page.at(-1);
  return c.json({
    events: page.map(({ dedupeKey, ...event }) => event),
    nextCursor:
      rows.length > 50 && last
        ? btoa(JSON.stringify({ at: last.createdAt, id: last.id }))
        : null,
    total: count?.total ?? 0,
    ...summary,
    actions: actions.map((x) => x.action),
    countries,
  });
});

auditRoutes.post("/api/files/:fileId/visit", async (c) => {
  const { file, project } = await fileAccess(c);
  const { mode } = await json(
    c,
    z.object({ mode: z.enum(["compact", "full"]) }).strict(),
  );
  await audit(
    c,
    project.id,
    mode === "full" ? "opened full view" : "opened preview",
    file.path,
    { resourceId: file.id, groupForMs: 60_000 },
  );
  return c.json({ ok: true });
});
