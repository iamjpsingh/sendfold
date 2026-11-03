import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { createAuth } from "./auth";
import { RateLimitError } from "./security";
import { type Env, fail } from "./context";
import { accountRoutes } from "./routes/account";
import { memberRoutes } from "./routes/members";
import { peopleRoutes } from "./routes/people";
import { projectsRoutes } from "./routes/projects";
import { filesRoutes } from "./routes/files";
import { editingRoutes } from "./routes/editing";
import { sharesRoutes } from "./routes/shares";
import { commentsRoutes } from "./routes/comments";
import { questionsRoutes } from "./routes/questions";
import { adminRoutes } from "./routes/admin";
import { projectItemsRoutes } from "./routes/project-items";
import { brandingRoutes } from "./routes/branding";
import { connectionRoutes } from "./connectors/connections";
import { serveMcp } from "./connectors/server";
import { auditProjectRoutes } from "./audit/projects";
import { auditRoutes } from "./audit/routes";
import { responseRoutes } from "./audit/responses";
export const app = new Hono<Env>();
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 30 * 1024 * 1024,
    onError: (c) => c.json({ error: "Maximum request size is 30 MB." }, 413),
  }),
);
app.use("*", async (c, next) => {
  c.set("auth", createAuth(c.env.platform));
  await c.get("auth").$context;
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    c.req.header("Origin") !== c.env.platform.origin &&
    !(
      c.req.header("Origin") === undefined &&
      (c.req.path === "/api/mcp" ||
        ["token", "register", "revoke", "introspect"].some(
          (x) => c.req.path === `/api/auth/oauth2/${x}`,
        ))
    )
  )
    fail(403, "Request origin is not allowed.");
  await next();
});
app.all("/.well-known/*", (c) => c.get("auth").handler(c.req.raw));
app.all("/api/mcp", (c) =>
  serveMcp(c, (request, env) => app.fetch(request, env)),
);
app.onError((error, c) => {
  if (error instanceof RateLimitError)
    c.header("Retry-After", String(error.retryAfter));
  if (error instanceof SyntaxError)
    return c.json({ error: "Invalid JSON body." }, 400);
  if (error instanceof z.ZodError)
    return c.json({ error: error.issues.map((x) => x.message).join(" ") }, 400);
  if (error instanceof HTTPException)
    return c.json({ error: error.message }, error.status);
  console.error("Request failed", { path: c.req.path, message: error.message });
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});

app.route("/", accountRoutes);
app.route("/", auditRoutes);
app.route("/", auditProjectRoutes);
app.route("/", responseRoutes);
app.route("/", brandingRoutes);
app.route("/", projectItemsRoutes);
app.route("/", connectionRoutes);
app.route("/", peopleRoutes);
app.route("/", memberRoutes);
app.route("/", projectsRoutes);
app.route("/", filesRoutes);
app.route("/", editingRoutes);
app.route("/", sharesRoutes);
app.route("/", commentsRoutes);
app.route("/", questionsRoutes);
app.route("/", adminRoutes);
app.notFound((c) => c.json({ error: "Not found." }, 404));
