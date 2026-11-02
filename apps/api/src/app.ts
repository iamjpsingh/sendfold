import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { createAuth } from "./auth";
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
export const app = new Hono<Env>();
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 30 * 1024 * 1024,
    onError: (c) => c.json({ error: "Maximum request size is 30 MB." }, 413),
  }),
);
app.use("/api/*", async (c, next) => {
  c.set("auth", createAuth(c.env.platform));
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    c.req.header("Origin") !== c.env.platform.origin
  )
    fail(403, "Request origin is not allowed.");
  await next();
});
app.onError((error, c) => {
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
