import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { connectorFixture } from "./connector-fixture";

test("OAuth discovery, DCR, signed consent, PKCE, refresh, revoke and reconnect", async () => {
  const f = await connectorFixture();
  try {
    const origin = f.platform.origin;
    const resource = (await (
      await f.fetch(`${origin}/.well-known/oauth-protected-resource/api/mcp`)
    ).json()) as any;
    assert.equal(resource.resource, `${origin}/api/mcp`);
    const metadata = (await (
      await f.fetch(`${origin}/.well-known/oauth-authorization-server/api/auth`)
    ).json()) as any;
    assert.equal(metadata.issuer, `${origin}/api/auth`);
    const registered = await f.fetch(metadata.registration_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "OAuth test",
        redirect_uris: ["http://127.0.0.1:3456/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "sendfold:read sendfold:write offline_access",
      }),
    });
    const client = (await registered.json()) as any;
    assert.ok(registered.ok, JSON.stringify(client));
    const verifier = randomBytes(32).toString("base64url");
    const authorize = new URL(metadata.authorization_endpoint);
    authorize.search = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: client.redirect_uris[0],
      response_type: "code",
      scope: "sendfold:read sendfold:write offline_access",
      resource: `${origin}/api/mcp`,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      state: "state-test",
    }).toString();
    const unauth = await f.fetch(authorize);
    assert.equal(unauth.status, 302);
    assert.equal(
      new URL(unauth.headers.get("location")!, origin).pathname,
      "/connect",
    );
    const login = await f.req("/auth/sign-in/email", "POST", {
      email: "owner@example.test",
      password: "Owner-password-123",
      oauth_query: new URL(
        unauth.headers.get("location")!,
        origin,
      ).search.slice(1),
    });
    const loginResult = (await login.json()) as any;
    assert.equal(loginResult.redirect, true);
    assert.equal(new URL(loginResult.url, origin).pathname, "/connect");
    assert.ok(f.cookie(login));
    async function approve() {
      const redirected = await f.fetch(authorize, {
        headers: { Cookie: f.owner },
      });
      assert.equal(redirected.status, 302);
      const query = new URL(
        redirected.headers.get("location")!,
        origin,
      ).search.slice(1);
      const info = await f.ok(
        "/connections/request",
        "POST",
        { query },
        f.owner,
      );
      assert.equal(info.label, "OAuth test");
      assert.equal(
        (
          await f.req(
            "/connections/request",
            "POST",
            { query: query.replace("OAuth", "tampered") + "&client_id=forged" },
            f.owner,
          )
        ).status,
        400,
      );
      const approved = await f.ok(
        "/connections/authorize",
        "POST",
        { query, accept: true, projectIds: [f.project.id], allowWrite: false },
        f.owner,
      );
      const callback = new URL(approved.url);
      assert.equal(callback.searchParams.get("state"), "state-test");
      return callback.searchParams.get("code")!;
    }
    async function exchange(body: Record<string, string>) {
      return f.fetch(metadata.token_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: client.client_id, ...body }),
      });
    }
    const badCode = await approve();
    const wrongVerifier = await exchange({
      grant_type: "authorization_code",
      code: badCode,
      code_verifier: randomBytes(32).toString("base64url"),
      redirect_uri: client.redirect_uris[0],
    });
    assert.equal(wrongVerifier.status, 400);
    const code = await approve();
    const issued = await exchange({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: client.redirect_uris[0],
      resource: `${origin}/api/mcp`,
    });
    const token = (await issued.json()) as any;
    assert.ok(issued.ok, JSON.stringify(token));
    assert.ok(!token.scope.includes("sendfold:write"));
    const mcp = await f.client(token.access_token);
    assert.equal((await f.call(mcp, "list_projects")).body.length, 1);
    assert.ok(
      !(await mcp.listTools()).tools.some(
        (tool) => tool.name === "add_comment",
      ),
    );
    const refresh = await exchange({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
      resource: `${origin}/api/mcp`,
    });
    const rotated = (await refresh.json()) as any;
    assert.ok(refresh.ok, JSON.stringify(rotated));
    const list = await f.ok("/connections", "GET", undefined, f.owner);
    await f.ok(
      `/connections/${list.connections.find((row: any) => row.clientId === client.client_id && !row.revokedAt).id}`,
      "DELETE",
      undefined,
      f.owner,
    );
    assert.equal(
      (
        await f.fetch(`${origin}/api/mcp`, {
          headers: { Authorization: `Bearer ${rotated.access_token}` },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await exchange({
          grant_type: "refresh_token",
          refresh_token: rotated.refresh_token,
        })
      ).status,
      400,
    );
    const newCode = await approve();
    const next = await exchange({
      grant_type: "authorization_code",
      code: newCode,
      code_verifier: verifier,
      redirect_uri: client.redirect_uris[0],
      resource: `${origin}/api/mcp`,
    });
    assert.ok(next.ok, await next.text());
    assert.equal(
      (
        await f.fetch(`${origin}/api/mcp`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        })
      ).status,
      401,
    );
    const replay = await exchange({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: client.redirect_uris[0],
    });
    assert.equal(replay.status, 400);
    await mcp.close();
  } finally {
    await f.cleanup();
  }
});
