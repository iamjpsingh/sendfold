import { Hono } from "hono";
import { eq, desc, sql, inArray } from "drizzle-orm";

import * as s from "@sendfold/database/schema";

import { type Env, fail, requireUser, requireAdmin } from "../context";
export const adminRoutes = new Hono<Env>();
adminRoutes.get("/api/activity", async (c) => {
  const u = await requireUser(c);
  return c.json(
    await c.env.platform.db
      .select()
      .from(s.activities)
      .where(
        u.role === "super_admin"
          ? undefined
          : inArray(
              s.activities.projectId,
              c.env.platform.db
                .select({ id: s.projectMembers.projectId })
                .from(s.projectMembers)
                .where(eq(s.projectMembers.userId, u.id)),
            ),
      )
      .orderBy(desc(s.activities.createdAt))
      .limit(100)
      .all(),
  );
});
adminRoutes.get("/api/admin/stats", async (c) => {
  const u = await requireAdmin(c);
  if (u.role !== "super_admin") fail(403, "Super admin access is required.");
  const db = c.env.platform.db;
  const [people, projects, files] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(s.user)
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(s.projects)
      .get(),
    db
      .select({
        count: sql<number>`count(*)`,
        bytes: sql<number>`coalesce(sum(size),0)`,
      })
      .from(s.files)
      .get(),
  ]);
  return c.json({
    people: people?.count ?? 0,
    projects: projects?.count ?? 0,
    files: files?.count ?? 0,
    bytes: files?.bytes ?? 0,
  });
});
