import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { setCookie } from "hono/cookie";
import * as s from "@sendfold/database/schema";
import {
  id,
  randomToken,
  digest,
  hashPassword,
  verifyPassword,
  throttle,
} from "../security";
import {
  type Env,
  fail,
  json,
  name,
  password,
  projectAccess,
  mutable,
  activity,
} from "../context";
export const sharesRoutes = new Hono<Env>();
sharesRoutes.get("/api/projects/:projectId/shares", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  if (!access.manage) fail(403, "Administrator access is required.");
  return c.json(
    (
      await c.env.platform.db
        .select()
        .from(s.shares)
        .where(eq(s.shares.projectId, project.id))
        .all()
    ).map(({ passwordHash, ...share }) => share),
  );
});
sharesRoutes.post("/api/projects/:projectId/shares", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  mutable(project, access, "manage");
  const input = await json(
    c,
    z.object({
      label: name,
      password,
      permission: z.enum(["view", "comment", "edit"]),
      allowDownload: z.boolean(),
      allowUpload: z.boolean(),
      expiresAt: z.number().nullable(),
    }),
  );
  if (input.expiresAt && input.expiresAt <= Date.now())
    fail(400, "Expiry must be in the future.");
  const { password: plain, ...values } = input,
    share = {
      ...values,
      id: id(),
      projectId: project.id,
      token: randomToken(),
      passwordHash: await hashPassword(plain),
      revokedAt: null,
      createdAt: Date.now(),
    };
  await c.env.platform.db.insert(s.shares).values(share);
  await activity(
    c,
    project,
    access.name,
    "shared",
    `Created ${share.label} link`,
  );
  const { passwordHash, ...safe } = share;
  return c.json(safe, 201);
});
sharesRoutes.delete("/api/shares/:shareId", async (c) => {
  const share = await c.env.platform.db
    .select()
    .from(s.shares)
    .where(eq(s.shares.id, c.req.param("shareId")))
    .get();
  if (!share) fail(404, "Link not found.");
  const { project, access } = await projectAccess(c, share.projectId);
  if (!access.manage) fail(403, "Administrator access is required.");
  await c.env.platform.db
    .update(s.shares)
    .set({ revokedAt: Date.now() })
    .where(eq(s.shares.id, share.id));
  await c.env.platform.db
    .delete(s.guests)
    .where(eq(s.guests.shareId, share.id));
  await activity(c, project, access.name, "revoked", share.label);
  return c.json({ ok: true });
});
sharesRoutes.get("/api/shared/:token", async (c) => {
  const share = await c.env.platform.db
    .select()
    .from(s.shares)
    .where(eq(s.shares.token, c.req.param("token")))
    .get();
  if (
    !share ||
    share.revokedAt ||
    (share.expiresAt && share.expiresAt <= Date.now())
  )
    fail(404, "This link has expired or been revoked.");
  return c.json({ available: true });
});
sharesRoutes.post("/api/shared/:token/unlock", async (c) => {
  const p = c.env.platform,
    token = c.req.param("token");
  const input = await json(
    c,
    z.object({
      password: z.string().max(128),
      name: z.string().trim().max(100).default("Guest"),
      email: z.union([z.email(), z.literal("")]).optional(),
    }),
  );
  const share = await p.db
    .select()
    .from(s.shares)
    .where(eq(s.shares.token, token))
    .get();
  if (
    !share ||
    share.revokedAt ||
    (share.expiresAt && share.expiresAt <= Date.now())
  )
    fail(404, "This link is no longer available.");
  await throttle(p.db, `share:${token}`, 12);
  if (
    !(await verifyPassword({
      password: input.password,
      hash: share.passwordHash,
    }))
  )
    fail(401, "Incorrect password. Please try again.");
  await p.db.delete(s.rateLimits).where(eq(s.rateLimits.key, `share:${token}`));
  const guestToken = randomToken(),
    expiresAt = Math.min(
      Date.now() + 8 * 60 * 60_000,
      share.expiresAt ?? Infinity,
    );
  await p.db.insert(s.guests).values({
    id: id(),
    tokenHash: await digest(guestToken),
    shareId: share.id,
    name: input.name || "Guest",
    email: input.email || null,
    expiresAt,
    createdAt: Date.now(),
  });
  setCookie(c, `sf_${share.id}`, guestToken, {
    httpOnly: true,
    secure: p.production,
    sameSite: "Strict",
    path: "/api",
    maxAge: Math.floor((expiresAt - Date.now()) / 1000),
  });
  return c.json({ projectId: share.projectId });
});
sharesRoutes.get("/api/shared/:token/session", async (c) => {
  const share = await c.env.platform.db
    .select()
    .from(s.shares)
    .where(eq(s.shares.token, c.req.param("token")))
    .get();
  if (!share) fail(404, "Link not found.");
  await projectAccess(c, share.projectId, share.token);
  return c.json({ projectId: share.projectId });
});
