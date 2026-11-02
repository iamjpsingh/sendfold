import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import * as s from "@sendfold/database/schema";
import {
  type C,
  type Env,
  fail,
  json,
  name,
  requireUser,
  projectAccess,
} from "../context";
import { id, randomToken, digest, throttle } from "../security";

export const connectionRoutes = new Hono<Env>();
const selection = z.object({
  projectIds: z.array(z.string().uuid()).min(1).max(100),
  allowWrite: z.boolean().default(false),
});
async function validateProjects(c: C, projectIds: string[]) {
  for (const projectId of new Set(projectIds))
    await projectAccess(c, projectId);
}
function publicConnection(row: s.Connection) {
  const { tokenHash: _, ...safe } = row;
  return safe;
}
async function authorization(c: C, query: string) {
  if (
    !(await verifyOAuthQueryParams(
      query,
      (await c.get("auth").$context).secret,
    ))
  )
    fail(
      400,
      "This authorization request expired or is invalid. Start again in your AI app.",
    );
  const params = new URLSearchParams(query);
  const clientId = params.get("client_id") ?? "";
  const client = await c.env.platform.db
    .select()
    .from(s.oauthClient)
    .where(eq(s.oauthClient.clientId, clientId))
    .get();
  if (!client || client.disabled) fail(400, "This app is unavailable.");
  return {
    clientId,
    label: client.name || "AI app",
    scopes: (params.get("scope") ?? "").split(" "),
    redirectUri: params.get("redirect_uri"),
  };
}
connectionRoutes.get("/api/connections", async (c) => {
  const u = await requireUser(c);
  const rows = await c.env.platform.db
    .select()
    .from(s.connections)
    .where(eq(s.connections.userId, u.id));
  return c.json({
    connections: rows.map(publicConnection),
    url: `${c.env.platform.origin}/api/mcp`,
  });
});
connectionRoutes.post("/api/connections", async (c) => {
  const u = await requireUser(c);
  await throttle(c.env.platform.db, `connections:${u.id}`, 20);
  const input = await json(
    c,
    selection.extend({
      label: name,
      days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
    }),
  );
  await validateProjects(c, input.projectIds);
  const token = `sf_mcp_${randomToken()}`;
  const row = {
    id: id(),
    userId: u.id,
    label: input.label,
    projectIds: [...new Set(input.projectIds)],
    allowWrite: input.allowWrite,
    tokenHash: await digest(token),
    createdAt: Date.now(),
    expiresAt: Date.now() + input.days * 86400_000,
  };
  const [created] = await c.env.platform.db
    .insert(s.connections)
    .values(row)
    .returning();
  return c.json({ connection: publicConnection(created), token }, 201);
});
connectionRoutes.delete("/api/connections/:id", async (c) => {
  const u = await requireUser(c),
    db = c.env.platform.db;
  const row = await db
    .select()
    .from(s.connections)
    .where(
      and(
        eq(s.connections.id, c.req.param("id")),
        eq(s.connections.userId, u.id),
      ),
    )
    .get();
  if (!row) fail(404, "Connection not found.");
  // Mark the grant dead before removing refresh tokens. Existing JWTs stop immediately.
  await db
    .update(s.connections)
    .set({ revokedAt: Date.now() })
    .where(eq(s.connections.id, row.id));
  if (row.clientId) {
    await db
      .delete(s.oauthRefreshToken)
      .where(
        and(
          eq(s.oauthRefreshToken.userId, u.id),
          eq(s.oauthRefreshToken.clientId, row.clientId),
        ),
      );
    await db
      .delete(s.oauthConsent)
      .where(
        and(
          eq(s.oauthConsent.userId, u.id),
          eq(s.oauthConsent.clientId, row.clientId),
        ),
      );
  }
  return c.json({ ok: true });
});
connectionRoutes.post("/api/connections/request", async (c) => {
  await requireUser(c);
  const { query } = await json(c, z.object({ query: z.string().max(16000) }));
  return c.json(await authorization(c, query));
});
connectionRoutes.post("/api/connections/authorize", async (c) => {
  const u = await requireUser(c),
    p = c.env.platform;
  const input = await json(
    c,
    selection.extend({
      projectIds: z.array(z.string().uuid()).max(100),
      query: z.string().max(16000),
      accept: z.boolean(),
    }),
  );
  const request = await authorization(c, input.query);
  if (input.accept) {
    if (!input.projectIds.length) fail(400, "Select at least one project.");
    await validateProjects(c, input.projectIds);
    if (!request.scopes.includes("sendfold:read"))
      fail(400, "The app must request sendfold:read.");
    if (input.allowWrite && !request.scopes.includes("sendfold:write"))
      fail(400, "This app did not request edits.");
  }
  const scope = request.scopes
    .filter((x) => x !== "sendfold:write" || input.allowWrite)
    .join(" ");
  const response = await c.get("auth").handler(
    new Request(`${p.origin}/api/auth/oauth2/consent`, {
      method: "POST",
      headers: c.req.raw.headers,
      body: JSON.stringify({
        accept: input.accept,
        scope,
        oauth_query: input.query,
      }),
    }),
  );
  if (!response.ok) return response;
  if (input.accept) {
    // One active grant per user/client; replacement never revives an old grant ID.
    await p.batch([
      {
        sql: "UPDATE connections SET revoked_at=? WHERE user_id=? AND client_id=? AND revoked_at IS NULL",
        params: [Date.now(), u.id, request.clientId],
      },
      {
        sql: "DELETE FROM oauth_refresh_token WHERE user_id=? AND client_id=?",
        params: [u.id, request.clientId],
      },
      {
        sql: "INSERT INTO connections(id,user_id,label,client_id,project_ids,allow_write,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)",
        params: [
          id(),
          u.id,
          request.label,
          request.clientId,
          JSON.stringify([...new Set(input.projectIds)]),
          input.allowWrite ? 1 : 0,
          Date.now(),
          Date.now() + 90 * 86400_000,
        ],
      },
    ]);
  }
  return response;
});
