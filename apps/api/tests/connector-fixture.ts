import assert from "node:assert/strict";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { app } from "../src/app";
import { fixture } from "./fixture";

export async function connectorFixture() {
  const f = await fixture();
  await f.ok("/setup", "POST", {
    token: "test-setup-token",
    name: "Owner",
    installation: "Studio",
    email: "owner@example.test",
    password: "Owner-password-123",
  });
  const owner = f.cookie(
    await f.req("/auth/sign-in/email", "POST", {
      email: "owner@example.test",
      password: "Owner-password-123",
    }),
  );
  const project = await f.ok("/projects", "POST", { name: "Approved" }, owner);
  const other = await f.ok("/projects", "POST", { name: "Private" }, owner);
  const fetch = async (input: string | URL | Request, init?: RequestInit) =>
    app.fetch(new Request(input, init), { platform: f.platform });
  async function client(token: string) {
    const client = new Client({ name: "sendfold-test", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`${f.platform.origin}/api/mcp`),
        {
          fetch,
          requestInit: { headers: { Authorization: `Bearer ${token}` } },
        },
      ),
    );
    return client;
  }
  async function grant(allowWrite = false, session = owner) {
    return f.ok(
      "/connections",
      "POST",
      { label: "Test AI", projectIds: [project.id], allowWrite },
      session,
    );
  }
  async function call(client: Client, name: string, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(Array.isArray(result.content));
    return {
      error: result.isError === true,
      body: JSON.parse((result.content[0] as { text: string }).text),
    };
  }
  return { ...f, owner, project, other, fetch, client, grant, call };
}
