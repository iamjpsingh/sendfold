import { drizzle } from "drizzle-orm/d1";
import * as schema from "@sendfold/database/schema";
import { app } from "./app";
import { cloudflareRequestInfo } from "./audit/request-info";
import type { Platform } from "./platform";
export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    if (!env.BETTER_AUTH_SECRET || !env.APP_ORIGIN)
      return Response.json(
        { error: "Server configuration is incomplete." },
        { status: 503 },
      );
    const platform: Platform = {
      requestInfo: cloudflareRequestInfo(request),
      db: drizzle(env.DB, { schema }),
      origin: env.APP_ORIGIN,
      secret: env.BETTER_AUTH_SECRET,
      setupToken: env.SETUP_TOKEN ?? "",
      production: true,
      blobs: {
        async put(key, bytes, contentType) {
          await env.BUCKET.put(key, bytes, { httpMetadata: { contentType } });
        },
        async get(key) {
          const obj = await env.BUCKET.get(key);
          return obj ? { body: obj.body, size: obj.size } : null;
        },
        async delete(key) {
          await env.BUCKET.delete(key);
        },
      },
      async batch(statements) {
        return (
          await env.DB.batch(
            statements.map((s) => env.DB.prepare(s.sql).bind(...s.params)),
          )
        ).map((r) => r.meta.changes);
      },
    };
    return app.fetch(request, { platform });
  },
} satisfies ExportedHandler<Cloudflare.Env>;
