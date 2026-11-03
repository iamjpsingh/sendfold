import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { settings } from "@sendfold/database/schema";
import { defaultBranding, type Branding } from "@sendfold/shared/branding";
import { type Env, type C, fail, json, requireAdmin } from "../context";
import { id } from "../security";

export const brandingRoutes = new Hono<Env>();
async function branding(c: C): Promise<Branding> {
  const row = await c.env.platform.db
    .select()
    .from(settings)
    .where(eq(settings.key, "branding"))
    .get();
  return { ...defaultBranding, ...(row ? JSON.parse(row.value) : {}) };
}
async function save(c: C, value: Partial<Branding>) {
  await c.env.platform.db
    .insert(settings)
    .values({
      key: "branding",
      value: JSON.stringify({ ...defaultBranding, ...value }),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: sql`json_patch(${settings.value}, ${JSON.stringify(value)})`,
      },
    });
}
const fields = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120),
  poweredByEnabled: z.boolean(),
  poweredByName: z.string().trim().min(1).max(60),
  poweredByUrl: z.union([
    z.literal(""),
    z
      .url()
      .max(2000)
      .refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      }, "Use an HTTPS website address without credentials."),
  ]),
});
brandingRoutes.get("/api/branding", async (c) => c.json(await branding(c)));
brandingRoutes.patch("/api/branding", async (c) => {
  await requireAdmin(c);
  const input = await json(c, fields);
  await save(c, input);
  return c.json(await branding(c));
});
brandingRoutes.post("/api/branding/logo", async (c) => {
  await requireAdmin(c);
  const upload = (await c.req.formData()).get("file");
  if (!(upload instanceof File) || upload.size > 1024 * 1024)
    fail(400, "Choose a PNG, JPEG or WebP logo up to 1 MB.");
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const matches = (signature: number[], offset = 0) =>
    signature.every((value, i) => bytes[offset + i] === value);
  const extension = matches([137, 80, 78, 71, 13, 10, 26, 10])
    ? "png"
    : matches([255, 216, 255])
      ? "jpg"
      : matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8)
        ? "webp"
        : null;
  if (!extension)
    fail(
      400,
      "Use a PNG, JPEG or WebP image. SVG and HTML are not supported for logos.",
    );
  const logoId = `${id()}.${extension}`,
    key = `branding/${logoId}`;
  await c.env.platform.blobs.put(
    key,
    bytes,
    extension === "jpg" ? "image/jpeg" : `image/${extension}`,
  );
  try {
    await save(c, { logoId });
  } catch (error) {
    await c.env.platform.blobs.delete(key);
    throw error;
  }
  // Only the current image is served; old branding assets remain private in storage.
  return c.json(await branding(c));
});
brandingRoutes.delete("/api/branding/logo", async (c) => {
  await requireAdmin(c);
  await save(c, { logoId: null });
  return c.json(await branding(c));
});
brandingRoutes.get("/api/branding/logo/:id", async (c) => {
  const logoId = c.req.param("id");
  if (
    !/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(logoId) ||
    (await branding(c)).logoId !== logoId
  )
    fail(404, "Logo not found.");
  const object = await c.env.platform.blobs.get(`branding/${logoId}`);
  if (!object) fail(404, "Logo not found.");
  const extension = logoId.split(".").pop();
  return new Response(object.body as BodyInit, {
    headers: {
      "Content-Type": extension === "jpg" ? "image/jpeg" : `image/${extension}`,
      "Content-Length": String(object.size),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "no-store",
    },
  });
});
