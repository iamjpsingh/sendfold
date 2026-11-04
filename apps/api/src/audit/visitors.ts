import { Hono } from "hono";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { auditEvents as events } from "@sendfold/database/schema";
import type { Env } from "../context";
import { requireProjectAdmin } from "./access";
import { identityFilters, projectCountries, countryCondition } from "./filters";

export const visitorRoutes = new Hono<Env>();
visitorRoutes.get("/api/projects/:projectId/visitors", async (c) => {
  const { project } = await requireProjectAdmin(c, c.req.param("projectId"));
  const input = z
    .object({
      ...identityFilters,
      offset: z.coerce.number().int().min(0).max(1000000).default(0),
      search: z.string().max(120).default(""),
      from: z.coerce.number().int().nonnegative().optional(),
      sort: z.enum(["recent", "events"]).default("recent"),
    })
    .parse(c.req.query());
  const db = c.env.platform.db;
  // Aggregate all records before filtering the latest identity/location. A search
  // must not silently change a visitor's lifetime count or first-recorded time.
  const summary = db
    .select({
      actorKey: events.actorKey,
      firstSeen: sql<number>`min(${events.createdAt})`.as("first_seen"),
      lastSeen: sql<number>`max(${events.createdAt})`.as("last_seen"),
      eventCount: sql<number>`count(*)`.as("event_count"),
      latestId:
        sql<string>`(SELECT recent.id FROM audit_events recent WHERE recent.project_id="audit_events"."project_id" AND recent.actor_key="audit_events"."actor_key" ORDER BY recent.created_at DESC, recent.id DESC LIMIT 1)`.as(
          "latest_id",
        ),
    })
    .from(events)
    .where(eq(events.projectId, project.id))
    .groupBy(events.actorKey)
    .as("visits");
  const condition = and(
    eq(events.projectId, project.id),
    input.kind ? eq(events.actorKind, input.kind) : undefined,
    countryCondition(input.country),
    input.from !== undefined
      ? sql`${summary.lastSeen} >= ${input.from}`
      : undefined,
    input.search
      ? sql`instr(lower(${events.actorName} || ' ' || coalesce(${events.actorEmail}, '') || ' ' || coalesce(${events.ipAddress}, '')), ${input.search.toLowerCase()}) > 0`
      : undefined,
  );
  const [visitors, total, countries] = await Promise.all([
    db
      .select({
        actorKey: events.actorKey,
        actorKind: events.actorKind,
        actorName: events.actorName,
        actorEmail: events.actorEmail,
        shareId: events.shareId,
        shareLabel: events.shareLabel,
        ipAddress: events.ipAddress,
        country: events.country,
        userAgent: events.userAgent,
        firstSeen: summary.firstSeen,
        lastSeen: summary.lastSeen,
        eventCount: summary.eventCount,
      })
      .from(events)
      .innerJoin(summary, eq(events.id, summary.latestId))
      .where(condition)
      .orderBy(
        ...(input.sort === "events" ? [desc(summary.eventCount)] : []),
        desc(summary.lastSeen),
        events.actorKey,
      )
      .limit(50)
      .offset(input.offset)
      .all(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .innerJoin(summary, eq(events.id, summary.latestId))
      .where(condition)
      .get(),
    projectCountries(db, project.id),
  ]);
  return c.json({ visitors, total: total?.count ?? 0, countries });
});
