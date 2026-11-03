import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";

import * as s from "@sendfold/database/schema";
import { audit } from "../audit/record";
import { id, cleanPath } from "../security";
import {
  type Env,
  fail,
  fileLimit,
  projectAccess,
  mutable,
  activity,
  fileAccess,
} from "../context";
export const filesRoutes = new Hono<Env>();
filesRoutes.post("/api/projects/:projectId/files", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  mutable(project, access, "upload");
  const db = c.env.platform.db,
    form = await c.req.formData(),
    upload = form.get("file");
  if (!(upload instanceof File)) fail(400, "Choose a file.");
  if (upload.size > fileLimit) fail(413, "Each file must be 25 MB or smaller.");
  const path = cleanPath(String(form.get("path") ?? upload.name));
  if (
    await db
      .select()
      .from(s.files)
      .where(and(eq(s.files.projectId, project.id), eq(s.files.path, path)))
      .get()
  )
    fail(
      409,
      "A file with this path already exists. Rename it or save a new revision from its editor.",
    );
  const file = {
    id: id(),
    projectId: project.id,
    name: path.split("/").pop()!,
    path,
    mime: upload.type || "application/octet-stream",
    size: upload.size,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const key = `files/${file.id}/${id()}`;
  await c.env.platform.blobs.put(
    key,
    new Uint8Array(await upload.arrayBuffer()),
    file.mime,
  );
  try {
    await c.env.platform.batch([
      {
        sql: "INSERT INTO files(id,project_id,name,path,mime,size,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        params: [
          file.id,
          project.id,
          file.name,
          path,
          file.mime,
          file.size,
          1,
          file.createdAt,
          file.updatedAt,
        ],
      },
      {
        sql: "INSERT INTO versions(id,file_id,number,object_key,size,author,created_at) VALUES(?,?,?,?,?,?,?)",
        params: [id(), file.id, 1, key, file.size, access.name, Date.now()],
      },
    ]);
  } catch (error) {
    await c.env.platform.blobs.delete(key);
    throw error;
  }
  await db
    .update(s.projects)
    .set({ updatedAt: Date.now() })
    .where(eq(s.projects.id, project.id));
  await activity(c, project, access.name, "uploaded", file.name, file.id);
  return c.json(file, 201);
});
filesRoutes.get("/api/files/:fileId/content", async (c) => {
  const { file, project, access } = await fileAccess(c);
  if (c.req.query("download") && !access.allowDownload)
    fail(403, "Downloads are disabled.");
  const version = await c.env.platform.db
    .select()
    .from(s.versions)
    .where(
      and(
        eq(s.versions.fileId, file.id),
        eq(s.versions.number, Number(c.req.query("version") ?? file.version)),
      ),
    )
    .get();
  if (!version) fail(404, "Version not found.");
  const object = await c.env.platform.blobs.get(version.objectKey);
  if (!object) fail(404, "File is unavailable.");
  await audit(
    c,
    project.id,
    c.req.query("download") ? "download requested" : "loaded file",
    file.path,
    {
      resourceId: file.id,
      groupForMs: c.req.query("download") ? undefined : 5 * 60_000,
    },
  );
  return new Response(object.body as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
});
filesRoutes.get("/api/files/:fileId/workbook", async (c) => {
  const { file, project } = await fileAccess(c);
  const version = await c.env.platform.db
    .select()
    .from(s.versions)
    .where(
      and(eq(s.versions.fileId, file.id), eq(s.versions.number, file.version)),
    )
    .get();
  if (!version?.workbookKey) return c.json(null);
  const object = await c.env.platform.blobs.get(version.workbookKey);
  if (object)
    await audit(c, project.id, "loaded file", file.path, {
      resourceId: file.id,
      groupForMs: 5 * 60_000,
    });
  return object
    ? new Response(object.body as BodyInit, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      })
    : c.json(null);
});
filesRoutes.get("/api/files/:fileId/versions", async (c) => {
  const { file } = await fileAccess(c);
  return c.json(
    await c.env.platform.db
      .select({
        id: s.versions.id,
        number: s.versions.number,
        author: s.versions.author,
        createdAt: s.versions.createdAt,
        size: s.versions.size,
      })
      .from(s.versions)
      .where(eq(s.versions.fileId, file.id))
      .orderBy(desc(s.versions.number))
      .all(),
  );
});
