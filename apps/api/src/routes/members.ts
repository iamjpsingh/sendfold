import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import * as s from "@sendfold/database/schema";
import {
  type Env,
  type C,
  fail,
  json,
  projectAccess,
  activity,
} from "../context";

export const memberRoutes = new Hono<Env>();
async function managed(c: C) {
  const result = await projectAccess(c, c.req.param("projectId")!);
  if (!result.access.manage)
    fail(403, "Project administrator access is required.");
  return result;
}
memberRoutes.get("/api/projects/:projectId/members", async (c) => {
  const { project } = await managed(c);
  return c.json(
    await c.env.platform.db
      .select({
        id: s.user.id,
        name: s.user.name,
        email: s.user.email,
        disabled: s.user.disabled,
        role: s.projectMembers.role,
      })
      .from(s.projectMembers)
      .innerJoin(s.user, eq(s.user.id, s.projectMembers.userId))
      .where(eq(s.projectMembers.projectId, project.id))
      .all(),
  );
});
memberRoutes.put("/api/projects/:projectId/members", async (c) => {
  const { project, access } = await managed(c),
    db = c.env.platform.db;
  const input = await json(
    c,
    z.object({ email: z.email(), role: z.enum(["admin", "editor", "viewer"]) }),
  );
  const target = await db
    .select()
    .from(s.user)
    .where(eq(s.user.email, input.email.trim().toLowerCase()))
    .get();
  if (!target || target.disabled)
    fail(
      400,
      "An active account with that email is required. Ask the super admin to create it first.",
    );
  if (target.role === "super_admin")
    fail(400, "Super admins already have access to every project.");
  if (access.actorKey === `user:${target.id}`)
    fail(400, "Ask another administrator to change your project access.");
  await db
    .insert(s.projectMembers)
    .values({
      projectId: project.id,
      userId: target.id,
      role: input.role,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [s.projectMembers.projectId, s.projectMembers.userId],
      set: { role: input.role },
    });
  await activity(
    c,
    project,
    access.name,
    "access",
    `Assigned ${target.name} as ${input.role}`,
  );
  return c.json({ ok: true });
});
memberRoutes.delete("/api/projects/:projectId/members/:userId", async (c) => {
  const { project, access } = await managed(c),
    userId = c.req.param("userId");
  if (access.actorKey === `user:${userId}`)
    fail(400, "Ask another administrator to remove your project access.");
  await c.env.platform.db
    .delete(s.projectMembers)
    .where(
      and(
        eq(s.projectMembers.projectId, project.id),
        eq(s.projectMembers.userId, userId),
      ),
    );
  await activity(c, project, access.name, "access", "Removed a project member");
  return c.json({ ok: true });
});
