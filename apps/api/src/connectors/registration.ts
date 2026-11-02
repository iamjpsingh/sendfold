import { z } from "zod";
import type { C } from "../context";
import { fail } from "../context";

// Keep public registration to ordinary MCP clients. No remote JWKS, webhook
// registration or client-credentials grants from an unauthenticated caller.
const registration = z
  .object({
    client_name: z.string().max(120).optional(),
    redirect_uris: z.array(z.string().url().max(2000)).min(1).max(10),
    token_endpoint_auth_method: z
      .enum(["none", "client_secret_post", "client_secret_basic"])
      .optional(),
    grant_types: z
      .array(z.enum(["authorization_code", "refresh_token"]))
      .max(2)
      .optional(),
    response_types: z.array(z.literal("code")).max(1).optional(),
    scope: z.string().max(200).optional(),
    application_type: z.enum(["web", "native"]).optional(),
    client_uri: z.string().url().max(2000).optional(),
    logo_uri: z.string().url().max(2000).optional(),
    contacts: z.array(z.email()).max(5).optional(),
    tos_uri: z.string().url().max(2000).optional(),
    policy_uri: z.string().url().max(2000).optional(),
    software_id: z.string().max(200).optional(),
    software_version: z.string().max(100).optional(),
  })
  .strict();

export async function registerClient(c: C) {
  if (c.req.method !== "POST") fail(400, "Registration requires POST.");
  if (Number(c.req.header("Content-Length") ?? 0) > 32_000)
    fail(413, "Registration is too large.");
  const body = registration.parse(await c.req.json());
  return c.get("auth").handler(
    new Request(c.req.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(c.req.header("Origin") ? { Origin: c.req.header("Origin")! } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
