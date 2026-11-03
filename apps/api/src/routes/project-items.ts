import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { projectItems } from "@sendfold/database/schema";
import {
  type Env,
  fail,
  json,
  projectAccess,
  mutable,
  activity,
} from "../context";
import { id } from "../security";

export const projectItemsRoutes = new Hono<Env>();
const fields = z.object({
  type: z.enum(["link", "task"]),
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().max(2000).nullable(),
  note: z.string().trim().max(2000),
  important: z.boolean(),
});
function validateLink(input: z.infer<typeof fields>) {
  if (input.type === "task") return { ...input, url: null };
  let url: URL;
  try {
    url = new URL(input.url ?? "");
  } catch {
    return fail(
      400,
      "Enter a full website address, such as https://example.com.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    fail(400, "Use an HTTP or HTTPS link without credentials.");
  return { ...input, url: url.href };
}
projectItemsRoutes.post("/api/projects/:projectId/items", async (c) => {
  const { project, access } = await projectAccess(c, c.req.param("projectId"));
  mutable(project, access, "edit");
  if (access.fileId) fail(403, "This link only allows its shared file.");
  const input = validateLink(
    await json(
      c,
      fields.extend({
        url: fields.shape.url.default(null),
        note: fields.shape.note.default(""),
        important: fields.shape.important.default(false),
      }),
    ),
  );
  const item = {
    ...input,
    id: id(),
    projectId: project.id,
    completed: false,
    author: access.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await c.env.platform.db.insert(projectItems).values(item);
  await activity(c, project, access.name, `added ${item.type}`, item.title);
  return c.json(item, 201);
});
projectItemsRoutes.patch("/api/items/:itemId", async (c) => {
  const db = c.env.platform.db;
  const item = await db
    .select()
    .from(projectItems)
    .where(eq(projectItems.id, c.req.param("itemId")))
    .get();
  if (!item) fail(404, "Item not found.");
  const { project, access } = await projectAccess(c, item.projectId);
  if (access.fileId) fail(403, "This link only allows its shared file.");
  const input = await json(
    c,
    fields.partial().extend({ completed: z.boolean().optional() }).strict(),
  );
  const completionOnly =
    Object.keys(input).length === 1 &&
    input.completed !== undefined &&
    item.type === "task";
  mutable(project, access, completionOnly ? "comment" : "edit");
  const updated = validateLink({ ...item, ...input });
  const completed =
    updated.type === "task" ? (input.completed ?? item.completed) : false;
  await db
    .update(projectItems)
    .set({
      ...input,
      ...(input.type !== undefined || input.url !== undefined
        ? { url: updated.url }
        : {}),
      ...(input.completed !== undefined || input.type !== undefined
        ? { completed }
        : {}),
      updatedAt: Date.now(),
    })
    .where(eq(projectItems.id, item.id));
  await activity(
    c,
    project,
    access.name,
    completionOnly
      ? completed
        ? "completed task"
        : "reopened task"
      : "updated item",
    updated.title,
  );
  return c.json({ ok: true });
});
