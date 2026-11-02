import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { app } from "./app";
import { createNodePlatform, repoRoot } from "./node-platform";
const envFile = resolve(repoRoot, ".env");
if (existsSync(envFile)) loadEnvFile(envFile);
const platform = createNodePlatform();
const server = new Hono();
server.all("/api/*", (c) => app.fetch(c.req.raw, { platform }));
server.all("/.well-known/*", (c) => app.fetch(c.req.raw, { platform }));
server.use("*", serveStatic({ root: resolve(repoRoot, "apps/web/dist") }));
server.get(
  "*",
  serveStatic({ path: resolve(repoRoot, "apps/web/dist/index.html") }),
);
const port = Number(process.env.PORT ?? 8787);
serve(
  { fetch: server.fetch, port, hostname: process.env.HOST ?? "127.0.0.1" },
  () => {
    console.log(`Sendfold API ready: http://127.0.0.1:${port}`);
    if (!process.env.SETUP_TOKEN && process.env.NODE_ENV !== "production")
      console.log(
        "First-run setup token is in .data/setup-token. Keep this file private.",
      );
  },
);
