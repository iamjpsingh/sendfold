import { Hono } from "hono";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import * as s from "@sendfold/database/schema";
import type { Env } from "../context";
import { requireProjectAdmin } from "./access";

export const responseRoutes = new Hono<Env>();
responseRoutes.get("/api/projects/:projectId/responses", async (c) => {
  const { project } = await requireProjectAdmin(c, c.req.param("projectId"));
  const input = z
    .object({
      search: z.string().max(120).default(""),
      question: z.uuid().optional(),
      offset: z.coerce.number().int().min(0).max(1000000).default(0),
    })
    .parse(c.req.query());
  const db = c.env.platform.db;
  const condition = and(
    eq(s.questions.projectId, project.id),
    input.question ? eq(s.answers.questionId, input.question) : undefined,
    input.search
      ? sql`instr(lower(${s.answers.author} || ' ' || ${s.questions.prompt} || ' ' || ${s.answers.value}), ${input.search.toLowerCase()}) > 0`
      : undefined,
  );
  const responses = await db
    .select({
      id: s.answers.id,
      questionId: s.answers.questionId,
      actorKey: s.answers.actorKey,
      author: s.answers.author,
      value: s.answers.value,
      updatedAt: s.answers.updatedAt,
      actorKind: sql<string>`CASE WHEN ${s.answers.actorKey} LIKE 'user:%' THEN 'member' WHEN ${s.answers.actorKey} LIKE 'guest:%' THEN 'guest' WHEN ${s.answers.actorKey} LIKE 'connector:%' THEN 'connector' ELSE 'legacy' END`,
      actorEmail: sql<
        string | null
      >`coalesce(${s.user.email}, ${s.guests.email}, (SELECT actor_email FROM audit_events WHERE project_id=${project.id} AND actor_key=${s.answers.actorKey} ORDER BY created_at DESC, id DESC LIMIT 1))`,
      shareLabel: sql<
        string | null
      >`coalesce(${s.shares.label}, (SELECT share_label FROM audit_events WHERE project_id=${project.id} AND actor_key=${s.answers.actorKey} ORDER BY created_at DESC, id DESC LIMIT 1))`,
    })
    .from(s.answers)
    .innerJoin(s.questions, eq(s.questions.id, s.answers.questionId))
    .leftJoin(s.user, eq(s.answers.actorKey, sql`'user:' || ${s.user.id}`))
    .leftJoin(s.guests, eq(s.answers.actorKey, sql`'guest:' || ${s.guests.id}`))
    .leftJoin(s.shares, eq(s.shares.id, s.guests.shareId))
    .where(condition)
    .orderBy(desc(s.answers.updatedAt), s.answers.id)
    .limit(50)
    .offset(input.offset)
    .all();
  const [count, summary] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(s.answers)
      .innerJoin(s.questions, eq(s.questions.id, s.answers.questionId))
      .where(condition)
      .get(),
    db
      .select({
        respondents: sql<number>`count(distinct ${s.answers.actorKey})`,
        responses: sql<number>`count(*)`,
        answeredQuestions: sql<number>`count(distinct ${s.answers.questionId})`,
      })
      .from(s.answers)
      .innerJoin(s.questions, eq(s.questions.id, s.answers.questionId))
      .where(eq(s.questions.projectId, project.id))
      .get(),
  ]);
  return c.json({ responses, total: count?.count ?? 0, summary });
});
