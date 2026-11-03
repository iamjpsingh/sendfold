import { Hono } from "hono";
import { eq, and, inArray } from "drizzle-orm";
import { projects, projectMembers } from "@sendfold/database/schema";
import { type Env, requireUser, fail } from "../context";

export const auditProjectRoutes = new Hono<Env>();
auditProjectRoutes.get("/api/audit/projects", async (c) => {
  if (c.env.connector) fail(403, "Administrator access is required.");
  const user = await requireUser(c),
    db = c.env.platform.db;
  return c.json(
    await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        user.role === "super_admin"
          ? undefined
          : inArray(
              projects.id,
              db
                .select({ id: projectMembers.projectId })
                .from(projectMembers)
                .where(
                  and(
                    eq(projectMembers.userId, user.id),
                    eq(projectMembers.role, "admin"),
                  ),
                ),
            ),
      )
      .orderBy(projects.name)
      .all(),
  );
});
