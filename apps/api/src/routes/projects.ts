import { Hono } from "hono";
import { and, eq, desc, sql, inArray, getTableColumns } from "drizzle-orm";
import { z } from "zod";

import * as s from "@sendfold/database/schema";
import { id } from "../security";
import {
  type Env,
  fail,
  json,
  name,
  requireUser,
  requireAdmin,
  projectAccess,
  activity,
} from "../context";
export const projectsRoutes = new Hono<Env>();
projectsRoutes.get("/api/projects", async (c) => {
  const u = await requireUser(c),
    db = c.env.platform.db;
  const now = Date.now();
  return c.json(
    await db
      .select({
        ...getTableColumns(s.projects),
        fileCount: sql<number>`(SELECT count(*) FROM files WHERE files.project_id = projects.id)`,
        commentCount: sql<number>`(SELECT count(*) FROM comments WHERE comments.project_id = projects.id)`,
        shareCount: sql<number>`(SELECT count(*) FROM shares WHERE shares.project_id = projects.id AND shares.revoked_at IS NULL AND (shares.expires_at IS NULL OR shares.expires_at > ${now}))`,
      })
      .from(s.projects)
      .where(
        and(
          c.env.connector
            ? inArray(s.projects.id, c.env.connector.projectIds)
            : undefined,
          u.role === "super_admin"
            ? undefined
            : inArray(
                s.projects.id,
                db
                  .select({ id: s.projectMembers.projectId })
                  .from(s.projectMembers)
                  .where(eq(s.projectMembers.userId, u.id)),
              ),
        ),
      )
      .orderBy(desc(s.projects.updatedAt))
      .all(),
  );
});
projectsRoutes.post("/api/projects", async (c) => {
  const u = await requireAdmin(c);
  const input = await json(
    c,
    z.object({
      name,
      client: z.string().max(120).default(""),
      description: z.string().max(2000).default(""),
      color: z
        .enum(["violet", "blue", "emerald", "amber", "rose"])
        .default("violet"),
    }),
  );
  const installation = await c.env.platform.db
    .select()
    .from(s.workspaces)
    .orderBy(s.workspaces.createdAt)
    .limit(1)
    .get();
  if (!installation) fail(409, "Complete installation setup first.");
  const workspaceId = installation.id;
  const p = {
    ...input,
    id: id(),
    workspaceId,
    status: "active",
    createdBy: u.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await c.env.platform.db.insert(s.projects).values(p);
  await activity(c, p, u.name, "created", "Created this project");
  return c.json(p, 201);
});
projectsRoutes.get("/api/projects/:projectId", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId")),
    db = c.env.platform.db;
  const [files, comments, questions, activities] = await Promise.all([
    db.select().from(s.files).where(eq(s.files.projectId, project.id)).all(),
    db
      .select()
      .from(s.comments)
      .where(eq(s.comments.projectId, project.id))
      .orderBy(s.comments.createdAt)
      .all(),
    db
      .select()
      .from(s.questions)
      .where(eq(s.questions.projectId, project.id))
      .orderBy(s.questions.position)
      .all(),
    db
      .select()
      .from(s.activities)
      .where(eq(s.activities.projectId, project.id))
      .orderBy(desc(s.activities.createdAt))
      .limit(50)
      .all(),
  ]);
  const answers = questions.length
    ? await db
        .select()
        .from(s.answers)
        .where(
          and(
            inArray(
              s.answers.questionId,
              questions.map((q) => q.id),
            ),
            access.manage ? undefined : eq(s.answers.actorKey, access.actorKey),
          ),
        )
        .all()
    : [];
  return c.json({
    project,
    access,
    files,
    comments,
    questions,
    answers,
    activities,
  });
});
projectsRoutes.patch("/api/projects/:projectId", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  if (!access.manage) fail(403, "Administrator access is required.");
  const input = await json(
    c,
    z.object({
      name: name.optional(),
      client: z.string().max(120).optional(),
      description: z.string().max(2000).optional(),
      status: z.enum(["active", "locked", "archived"]).optional(),
    }),
  );
  await c.env.platform.db
    .update(s.projects)
    .set({ ...input, updatedAt: Date.now() })
    .where(eq(s.projects.id, project.id));
  await activity(
    c,
    project,
    access.name,
    "updated",
    input.status
      ? `Project ${input.status === "active" ? "reopened" : input.status}`
      : "Updated project details",
  );
  return c.json({ ok: true });
});
