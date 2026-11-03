import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";

import * as s from "@sendfold/database/schema";
import { id } from "../security";
import {
  type Env,
  fail,
  json,
  projectAccess,
  mutable,
  activity,
} from "../context";
export const questionsRoutes = new Hono<Env>();
questionsRoutes.post("/api/projects/:projectId/questions", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  mutable(project, access, "manage");
  const input = await json(
    c,
    z.object({
      prompt: z.string().trim().min(1).max(2000),
      type: z.enum(["text", "single", "multiple", "approval"]),
      options: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
    }),
  );
  if (["single", "multiple"].includes(input.type) && input.options.length < 2)
    fail(400, "Add at least two choices.");
  if (
    new Set(input.options.map((v) => v.toLowerCase())).size !==
    input.options.length
  )
    fail(400, "Each choice must be different.");
  const q = {
    ...input,
    id: id(),
    projectId: project.id,
    position: Date.now(),
    createdAt: Date.now(),
  };
  await c.env.platform.db.insert(s.questions).values(q);
  await activity(c, project, access.name, "added question", q.prompt);
  return c.json(q, 201);
});
questionsRoutes.put("/api/questions/:questionId/answer", async (c) => {
  const q = await c.env.platform.db
    .select()
    .from(s.questions)
    .where(eq(s.questions.id, c.req.param("questionId")))
    .get();
  if (!q) fail(404, "Question not found.");
  const { project, access } = await projectAccess(c, q.projectId);
  mutable(project, access, "comment");
  if (access.fileId) fail(403, "This link only allows its shared file.");
  const input = await json(
    c,
    z.object({
      value: z.union([
        z.string().max(4000),
        z.array(z.string().max(200)).max(30),
      ]),
    }),
  );
  if (
    q.type === "multiple" &&
    (!Array.isArray(input.value) ||
      input.value.some((v) => !q.options.includes(v)))
  )
    fail(400, "Select valid choices.");
  if (
    q.type === "single" &&
    (typeof input.value !== "string" || !q.options.includes(input.value))
  )
    fail(400, "Select a valid choice.");
  if (
    q.type === "approval" &&
    (typeof input.value !== "string" ||
      !["Approved", "Changes requested", "Rejected"].includes(input.value))
  )
    fail(400, "Select a valid decision.");
  if (q.type === "text" && typeof input.value !== "string")
    fail(400, "Enter a text answer.");
  const answer = {
    id: id(),
    questionId: q.id,
    actorKey: access.actorKey,
    author: access.name,
    value: input.value,
    updatedAt: Date.now(),
  };
  await c.env.platform.db
    .insert(s.answers)
    .values(answer)
    .onConflictDoUpdate({
      target: [s.answers.questionId, s.answers.actorKey],
      set: { value: input.value, author: access.name, updatedAt: Date.now() },
    });
  await activity(c, project, access.name, "answered", q.prompt.slice(0, 100));
  return c.json({ ok: true });
});
