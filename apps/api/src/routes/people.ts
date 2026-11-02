import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as s from "@sendfold/database/schema";
import {
  type Env,
  fail,
  json,
  name,
  password,
  role,
  requireAdmin,
} from "../context";

export const peopleRoutes = new Hono<Env>();
peopleRoutes.get("/api/people", async (c) => {
  await requireAdmin(c);
  return c.json(
    await c.env.platform.db
      .select({
        id: s.user.id,
        name: s.user.name,
        email: s.user.email,
        role: s.user.role,
        disabled: s.user.disabled,
        createdAt: s.user.createdAt,
      })
      .from(s.user)
      .all(),
  );
});
peopleRoutes.post("/api/people", async (c) => {
  await requireAdmin(c);
  const input = await json(
    c,
    z.object({
      name,
      email: z.email(),
      password,
      role: role.default("member"),
    }),
  );
  const result = await c.get("auth").api.signUpEmail({
    body: { email: input.email, password: input.password, name: input.name },
  });
  await c.env.platform.db
    .update(s.user)
    .set({ role: input.role })
    .where(eq(s.user.id, result.user.id));
  return c.json({ id: result.user.id }, 201);
});
peopleRoutes.patch("/api/people/:userId", async (c) => {
  const u = await requireAdmin(c),
    db = c.env.platform.db;
  const target = await db
    .select()
    .from(s.user)
    .where(eq(s.user.id, c.req.param("userId")))
    .get();
  if (!target) fail(404, "Person not found.");
  if (target.id === u.id || target.role === "super_admin")
    fail(403, "Super admin accounts and your own access are protected.");
  const input = await json(c, z.object({ disabled: z.boolean() }));
  await db.update(s.user).set(input).where(eq(s.user.id, target.id));
  await db.delete(s.session).where(eq(s.session.userId, target.id));
  return c.json({ ok: true });
});
