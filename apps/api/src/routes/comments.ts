import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
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
export const commentsRoutes = new Hono<Env>();
commentsRoutes.post("/api/projects/:projectId/comments", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  mutable(project, access, "comment");
  const input = await json(
    c,
    z.object({
      body: z.string().trim().min(1).max(4000),
      fileId: z.string().nullable().default(null),
    }),
  );
  if (access.fileId && input.fileId !== access.fileId)
    fail(403, "Feedback is limited to the shared file.");
  let version: number | null = null;
  if (input.fileId) {
    const file = await c.env.platform.db
      .select()
      .from(s.files)
      .where(
        and(eq(s.files.id, input.fileId), eq(s.files.projectId, project.id)),
      )
      .get();
    if (!file) fail(400, "File does not belong to this project.");
    version = file.version;
  }
  const comment = {
    ...input,
    id: id(),
    projectId: project.id,
    version,
    author: access.name,
    actorKey: access.actorKey,
    resolved: false,
    createdAt: Date.now(),
  };
  await c.env.platform.db.insert(s.comments).values(comment);
  await activity(
    c,
    project,
    access.name,
    "commented",
    input.fileId ? "File feedback" : "Project feedback",
    comment.id,
  );
  return c.json(comment, 201);
});
commentsRoutes.patch("/api/comments/:commentId", async (c) => {
  const comment = await c.env.platform.db
    .select()
    .from(s.comments)
    .where(eq(s.comments.id, c.req.param("commentId")))
    .get();
  if (!comment) fail(404, "Comment not found.");
  const { project, access } = await projectAccess(c, comment.projectId);
  mutable(project, access, "comment");
  if (access.fileId && comment.fileId !== access.fileId)
    fail(403, "Feedback is limited to the shared file.");
  if (!access.manage && access.actorKey !== comment.actorKey)
    fail(403, "Only the author or an administrator can resolve this comment.");
  const input = await json(c, z.object({ resolved: z.boolean() }));
  await c.env.platform.db
    .update(s.comments)
    .set(input)
    .where(eq(s.comments.id, comment.id));
  await activity(
    c,
    project,
    access.name,
    input.resolved ? "resolved comment" : "reopened comment",
    "Updated feedback status",
    comment.id,
  );
  return c.json({ ok: true });
});
