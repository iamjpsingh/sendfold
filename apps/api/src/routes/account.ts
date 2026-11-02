import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";

import * as s from "@sendfold/database/schema";
import { id, digest, equalSecret, throttle } from "../security";
import { type Env, fail, json, name, password, requireUser } from "../context";
export const accountRoutes = new Hono<Env>();
accountRoutes.get("/api/health", (c) => c.json({ ok: true, app: "sendfold" }));
accountRoutes.get("/api/setup", async (c) =>
  c.json({
    required: !(await c.env.platform.db.select().from(s.user).limit(1).get()),
  }),
);
accountRoutes.post("/api/setup", async (c) => {
  const p = c.env.platform;
  await throttle(p.db, "setup", 8);
  const input = await json(
    c,
    z.object({
      token: z.string(),
      name,
      email: z.email(),
      password,
      installation: name,
    }),
  );
  if (!p.setupToken || !(await equalSecret(input.token, p.setupToken)))
    fail(403, "The setup token is incorrect.");
  if (await p.db.select().from(s.user).limit(1).get())
    fail(409, "Setup is already complete.");
  const claimed = await p.db
    .insert(s.settings)
    .values({ key: "setup_claim", value: "claimed" })
    .onConflictDoNothing()
    .returning();
  if (!claimed.length) fail(409, "Setup is already in progress.");
  const w = { id: id(), name: input.installation, createdAt: Date.now() };
  let createdUserId: string | undefined;
  try {
    await p.db.insert(s.workspaces).values(w);
    const result = await c.get("auth").api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
      },
    });
    createdUserId = result.user.id;
    await p.db
      .update(s.user)
      .set({ role: "super_admin", workspaceId: w.id })
      .where(eq(s.user.id, result.user.id));
    return c.json({ ok: true }, 201);
  } catch (error) {
    if (createdUserId)
      await p.db.delete(s.user).where(eq(s.user.id, createdUserId));
    await p.db.delete(s.workspaces).where(eq(s.workspaces.id, w.id));
    await p.db.delete(s.settings).where(eq(s.settings.key, "setup_claim"));
    throw error;
  }
});
accountRoutes.all("/api/auth/*", async (c) => {
  const route = c.req.path.slice("/api/auth/".length);
  if (
    ![
      "sign-in/email",
      "sign-out",
      "get-session",
      "change-password",
      "update-user",
    ].includes(route)
  )
    fail(
      403,
      "Public registration is disabled. Ask your administrator for an account.",
    );
  if (route === "sign-in/email") {
    const body = z
      .object({ email: z.string() })
      .parse(await c.req.raw.clone().json());
    await throttle(
      c.env.platform.db,
      `login:${await digest(String(body.email).toLowerCase())}`,
      15,
    );
    const existing = await c.env.platform.db
      .select()
      .from(s.user)
      .where(eq(s.user.email, String(body.email).toLowerCase()))
      .get();
    if (existing?.disabled) fail(403, "This account is disabled.");
  }
  return c.get("auth").handler(c.req.raw);
});
accountRoutes.get("/api/me", async (c) => {
  const u = await requireUser(c);
  return c.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      disabled: u.disabled,
    },
    installation: await c.env.platform.db
      .select()
      .from(s.workspaces)
      .orderBy(s.workspaces.createdAt)
      .limit(1)
      .get(),
  });
});
