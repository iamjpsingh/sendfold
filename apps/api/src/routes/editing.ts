import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";

import * as s from "@sendfold/database/schema";
import { id } from "../security";
import {
  type Env,
  fail,
  fileLimit,
  mutable,
  activity,
  fileAccess,
} from "../context";
export const editingRoutes = new Hono<Env>();
editingRoutes.post("/api/files/:fileId/lease", async (c) => {
  const { file, project, access } = await fileAccess(c);
  mutable(project, access, "edit");
  const db = c.env.platform.db,
    now = Date.now();
  const rows = await db
    .insert(s.leases)
    .values({
      fileId: file.id,
      actorKey: access.actorKey,
      author: access.name,
      expiresAt: now + 90_000,
    })
    .onConflictDoUpdate({
      target: s.leases.fileId,
      set: {
        actorKey: access.actorKey,
        author: access.name,
        expiresAt: now + 90_000,
      },
      setWhere: sql`${s.leases.expiresAt}<${now} OR ${s.leases.actorKey}=${access.actorKey}`,
    })
    .returning();
  if (!rows.length) {
    const held = await db
      .select()
      .from(s.leases)
      .where(eq(s.leases.fileId, file.id))
      .get();
    fail(
      409,
      `${held?.author ?? "Someone"} is editing this file. You can continue viewing it.`,
    );
  }
  return c.json({ expiresAt: now + 90_000, version: file.version });
});
editingRoutes.delete("/api/files/:fileId/lease", async (c) => {
  const { file, access } = await fileAccess(c);
  await c.env.platform.db
    .delete(s.leases)
    .where(
      and(eq(s.leases.fileId, file.id), eq(s.leases.actorKey, access.actorKey)),
    );
  return c.json({ ok: true });
});
editingRoutes.post("/api/files/:fileId/revisions", async (c) => {
  const { file, project, access } = await fileAccess(c);
  mutable(project, access, "edit");
  const p = c.env.platform,
    db = p.db;
  const lease = await db
    .select()
    .from(s.leases)
    .where(eq(s.leases.fileId, file.id))
    .get();
  if (
    !lease ||
    lease.actorKey !== access.actorKey ||
    lease.expiresAt < Date.now()
  )
    fail(409, "Your editing lock expired. Reopen the editor before saving.");
  const form = await c.req.formData(),
    upload = form.get("file"),
    snapshot = form.get("workbook"),
    expected = Number(form.get("version"));
  if (!(upload instanceof File) || upload.size > fileLimit)
    fail(400, "A valid file up to 25 MB is required.");
  if (expected !== file.version)
    fail(409, "A newer revision exists. Reload before saving.");
  const revisionId = id(),
    key = `files/${file.id}/${revisionId}`,
    workbookKey = typeof snapshot === "string" ? `${key}.json` : null;
  if (typeof snapshot === "string") {
    if (snapshot.length > 10 * 1024 * 1024) fail(413, "Workbook is too large.");
    const parsed = JSON.parse(snapshot);
    if (!parsed.sheets || !Array.isArray(parsed.sheetOrder))
      fail(400, "Invalid workbook snapshot.");
    await p.blobs.put(
      workbookKey!,
      new TextEncoder().encode(snapshot),
      "application/json",
    );
  }
  await p.blobs.put(key, new Uint8Array(await upload.arrayBuffer()), file.mime);
  try {
    const result = await p.batch([
      {
        sql: "INSERT INTO versions(id,file_id,number,object_key,workbook_key,size,author,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM files WHERE id=? AND version=?) AND EXISTS(SELECT 1 FROM leases WHERE file_id=? AND actor_key=? AND expires_at>?)",
        params: [
          revisionId,
          file.id,
          expected + 1,
          key,
          workbookKey,
          upload.size,
          access.name,
          Date.now(),
          file.id,
          expected,
          file.id,
          access.actorKey,
          Date.now(),
        ],
      },
      {
        sql: "UPDATE files SET version=?,size=?,updated_at=? WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM versions WHERE id=?)",
        params: [
          expected + 1,
          upload.size,
          Date.now(),
          file.id,
          expected,
          revisionId,
        ],
      },
    ]);
    if (result[1] !== 1)
      fail(
        409,
        "The file changed or your editing lock expired. Reopen before saving.",
      );
  } catch (error) {
    await p.blobs.delete(key);
    if (workbookKey) await p.blobs.delete(workbookKey);
    throw error;
  }
  await db
    .update(s.projects)
    .set({ updatedAt: Date.now() })
    .where(eq(s.projects.id, project.id));
  await activity(
    c,
    project,
    access.name,
    "saved",
    `${file.name} · version ${expected + 1}`,
  );
  return c.json({ version: expected + 1 });
});
