import { type Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { getCookie } from "hono/cookie";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createAuth } from "./auth";
import type { Platform } from "./platform";
import * as s from "@sendfold/database/schema";
import { id, digest } from "./security";
import type { Access } from "@sendfold/shared/types";
import type { ConnectorPrincipal } from "./connectors/authenticate";

export type Env = {
  Bindings: { platform: Platform; connector?: ConnectorPrincipal };
  Variables: { auth: ReturnType<typeof createAuth> };
};
export type C = Context<Env>;
export function fail(
  status: 400 | 401 | 403 | 404 | 409 | 413,
  message: string,
): never {
  throw new HTTPException(status, { message });
}
export const json = async <T>(c: C, schema: z.ZodType<T>) =>
  schema.parse(await c.req.json());
export const name = z.string().trim().min(1).max(120);
export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128);
export const role = z.enum(["super_admin", "member"]);
export const fileLimit = 25 * 1024 * 1024;

export async function currentUser(c: C) {
  const authSession = c.env.connector
    ? { user: { id: c.env.connector.userId } }
    : await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  if (!authSession) return null;
  const result = await c.env.platform.db
    .select()
    .from(s.user)
    .where(eq(s.user.id, authSession.user.id))
    .get();
  return result && !result.disabled ? result : null;
}
export async function requireUser(c: C) {
  return (await currentUser(c)) ?? fail(401, "Please sign in.");
}
export async function requireAdmin(c: C) {
  if (c.env.connector)
    fail(403, "Connectors cannot manage installation settings.");
  const u = await requireUser(c);
  if (u.role !== "super_admin") fail(403, "Super admin access is required.");
  return u;
}
export async function projectAccess(
  c: C,
  projectId: string,
  shareToken?: string,
): Promise<{ project: s.Project; access: Access }> {
  const db = c.env.platform.db,
    project = await db
      .select()
      .from(s.projects)
      .where(eq(s.projects.id, projectId))
      .get();
  if (!project) fail(404, "Project not found.");
  const connector = c.env.connector;
  if (connector && !connector.projectIds.includes(projectId))
    fail(403, "This project was not approved for this connector.");
  const u = await currentUser(c);
  const membership = u
    ? await db
        .select()
        .from(s.projectMembers)
        .where(
          and(
            eq(s.projectMembers.projectId, projectId),
            eq(s.projectMembers.userId, u.id),
          ),
        )
        .get()
    : null;
  if (u && (u.role === "super_admin" || membership))
    return {
      project,
      access: {
        permission:
          (!connector || connector.allowWrite) &&
          (u.role === "super_admin" || membership?.role !== "viewer")
            ? "edit"
            : "view",
        allowDownload: true,
        allowUpload:
          (!connector || connector.allowWrite) &&
          (u.role === "super_admin" || membership?.role !== "viewer"),
        manage:
          (!connector || connector.allowWrite) &&
          (u.role === "super_admin" || membership?.role === "admin"),
        actorKey: connector ? `connector:${connector.id}` : `user:${u.id}`,
        name: connector ? `${u.name} via ${connector.label}` : u.name,
      },
    };
  if (connector) fail(403, "Your project membership no longer allows access.");
  const token = shareToken ?? c.req.query("share");
  if (!token) fail(u ? 403 : 401, "You do not have access to this project.");
  const share = await db
    .select()
    .from(s.shares)
    .where(and(eq(s.shares.token, token), eq(s.shares.projectId, projectId)))
    .get();
  if (
    !share ||
    share.revokedAt ||
    (share.expiresAt && share.expiresAt <= Date.now())
  )
    fail(403, "This share link is no longer available.");
  const cookie = getCookie(c, `sf_${share.id}`);
  if (!cookie) fail(401, "Enter the project password to continue.");
  const guest = await db
    .select()
    .from(s.guests)
    .where(
      and(
        eq(s.guests.tokenHash, await digest(cookie)),
        eq(s.guests.shareId, share.id),
      ),
    )
    .get();
  if (!guest || guest.expiresAt <= Date.now())
    fail(401, "Your session has expired. Enter the password again.");
  return {
    project,
    access: {
      permission: share.permission as Access["permission"],
      allowDownload: share.allowDownload,
      allowUpload: !share.fileId && share.allowUpload,
      fileId: share.fileId,
      viewMode: share.viewMode,
      manage: false,
      actorKey: `guest:${guest.id}`,
      name: guest.name,
    },
  };
}
export function mutable(
  project: s.Project,
  access: Access,
  mode: "edit" | "comment" | "upload" | "manage",
) {
  if (project.status !== "active")
    fail(403, "This project is locked. An administrator can reopen it.");
  if (mode === "manage" && !access.manage)
    fail(403, "Administrator access is required.");
  if (mode === "edit" && access.permission !== "edit")
    fail(403, "Editing is not enabled for this link.");
  if (mode === "comment" && access.permission === "view")
    fail(403, "Feedback is not enabled for this link.");
  if (mode === "upload" && !access.allowUpload)
    fail(403, "Uploads are not enabled for this link.");
}
export async function activity(
  c: C,
  p: s.Project,
  author: string,
  action: string,
  detail: string,
) {
  await c.env.platform.db.insert(s.activities).values({
    id: id(),
    workspaceId: p.workspaceId,
    projectId: p.id,
    author,
    action,
    detail,
    createdAt: Date.now(),
  });
}
export async function fileAccess(c: C) {
  const file = await c.env.platform.db
    .select()
    .from(s.files)
    .where(eq(s.files.id, c.req.param("fileId")!))
    .get();
  if (!file) fail(404, "File not found.");
  const result = await projectAccess(c, file.projectId);
  if (result.access.fileId && result.access.fileId !== file.id)
    fail(403, "This link only allows its shared file.");
  return { file, ...result };
}
