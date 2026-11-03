import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
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
  releaseAttempt,
  RateLimitError,
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
import { audit, anonymousActor } from "../audit/record";
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
      fileId: z.string().min(1).nullable().default(null),
      viewMode: z.enum(["compact", "full"]).default("compact"),
      password,
      permission: z.enum(["view", "comment", "edit"]),
      allowDownload: z.boolean(),
      allowUpload: z.boolean(),
      expiresAt: z.number().nullable(),
    }),
  );
  if (input.expiresAt && input.expiresAt <= Date.now())
    fail(400, "Expiry must be in the future.");
  if (input.fileId) {
    const file = await c.env.platform.db
      .select()
      .from(s.files)
      .where(eq(s.files.id, input.fileId))
      .get();
    if (!file || file.projectId !== project.id)
      fail(400, "Choose a file from this project.");
    input.allowUpload = false;
  }
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
  const visitor = await anonymousActor(c, share);
  let attempt;
  try {
    attempt = await throttle(p.db, `share:${token}`, 5);
  } catch (error) {
    if (error instanceof RateLimitError)
      await audit(
        c,
        share.projectId,
        "unlock blocked",
        "Too many password attempts",
        { actor: visitor, groupForMs: 60_000, groupBy: share.id },
      );
    throw error;
  }
  if (
    !(await verifyPassword({
      password: input.password,
      hash: share.passwordHash,
    }))
  ) {
    await audit(
      c,
      share.projectId,
      "unlock failed",
      "Incorrect link password",
      { actor: visitor },
    );
    fail(401, "Incorrect password. Please try again.");
  }
  await releaseAttempt(p.db, attempt);
  const guestToken = randomToken(),
    expiresAt = Math.min(
      Date.now() + 8 * 60 * 60_000,
      share.expiresAt ?? Infinity,
    );
  const guestId = id();
  await p.db.insert(s.guests).values({
    id: guestId,
    tokenHash: await digest(guestToken),
    shareId: share.id,
    name: input.name || "Guest",
    email: input.email || null,
    expiresAt,
    createdAt: Date.now(),
  });
  await audit(c, share.projectId, "unlocked link", share.label, {
    actor: {
      actorKey: `guest:${guestId}`,
      actorKind: "guest",
      actorName: input.name || "Guest",
      actorEmail: input.email || null,
      shareId: share.id,
      shareLabel: share.label,
    },
  });
  setCookie(c, `sf_${share.id}`, guestToken, {
    httpOnly: true,
    secure: p.production,
    sameSite: "Strict",
    path: "/api",
    maxAge: Math.floor((expiresAt - Date.now()) / 1000),
  });
  return c.json({
    projectId: share.projectId,
    fileId: share.fileId,
    viewMode: share.viewMode,
  });
});
sharesRoutes.get("/api/shared/:token/session", async (c) => {
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
  try {
    await projectAccess(c, share.projectId, share.token);
  } catch (error) {
    if (!(error instanceof HTTPException) || ![401, 403].includes(error.status))
      throw error;
    await audit(c, share.projectId, "opened link", share.label, {
      actor: await anonymousActor(c, share),
      groupForMs: 5 * 60_000,
    });
    throw error;
  }
  return c.json({
    projectId: share.projectId,
    fileId: share.fileId,
    viewMode: share.viewMode,
  });
});
