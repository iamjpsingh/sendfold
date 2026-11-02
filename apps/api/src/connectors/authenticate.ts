import { createLocalJWKSet, jwtVerify } from "jose";
import { eq, and } from "drizzle-orm";
import * as s from "@sendfold/database/schema";
import { type C } from "../context";
import { digest } from "../security";

export type ConnectorPrincipal = s.Connection;
export async function authenticateConnector(
  c: C,
): Promise<ConnectorPrincipal | null> {
  const match = /^Bearer ([^\s]+)$/i.exec(c.req.header("Authorization") ?? "");
  if (!match || match[1].length > 16000) return null;
  const token = match[1],
    db = c.env.platform.db;
  let row: s.Connection | undefined;
  if (token.startsWith("sf_mcp_")) {
    row = await db
      .select()
      .from(s.connections)
      .where(eq(s.connections.tokenHash, await digest(token)))
      .get();
  } else {
    try {
      const keys = await c.get("auth").api.getJwks();
      const { payload } = await jwtVerify(token, createLocalJWKSet(keys), {
        issuer: `${c.env.platform.origin}/api/auth`,
        audience: `${c.env.platform.origin}/api/mcp`,
        requiredClaims: ["sub", "exp", "iat", "azp", "sendfold_connection"],
      });
      if (
        payload.cnf ||
        !String(payload.scope ?? "")
          .split(" ")
          .includes("sendfold:read")
      )
        return null;
      row = await db
        .select()
        .from(s.connections)
        .where(
          and(
            eq(s.connections.id, String(payload.sendfold_connection)),
            eq(s.connections.userId, payload.sub!),
            eq(s.connections.clientId, String(payload.azp)),
          ),
        )
        .get();
      if (row)
        row.allowWrite &&= String(payload.scope)
          .split(" ")
          .includes("sendfold:write");
      const client = await db
        .select()
        .from(s.oauthClient)
        .where(eq(s.oauthClient.clientId, String(payload.azp)))
        .get();
      if (!client || client.disabled) return null;
    } catch {
      return null;
    }
  }
  if (!row || row.revokedAt || row.expiresAt <= Date.now()) return null;
  const user = await db
    .select()
    .from(s.user)
    .where(eq(s.user.id, row.userId))
    .get();
  if (!user || user.disabled) return null;
  await db
    .update(s.connections)
    .set({ lastUsedAt: Date.now() })
    .where(eq(s.connections.id, row.id));
  return row;
}

export function unauthorized(c: C) {
  c.header(
    "WWW-Authenticate",
    `Bearer resource_metadata="${c.env.platform.origin}/.well-known/oauth-protected-resource/api/mcp", scope="sendfold:read sendfold:write offline_access"`,
  );
  return c.json(
    { error: "Connect and approve project access in Sendfold." },
    401,
  );
}
