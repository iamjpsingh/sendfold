import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import * as s from "@sendfold/database/schema";
import { connectorFixture } from "./connector-fixture";

test("MCP SDK client: scopes, revisions, project locks, revocation and origin boundary", async () => {
  const f = await connectorFixture();
  try {
    const unauthorized = await f.fetch(`${f.platform.origin}/api/mcp`);
    assert.equal(unauthorized.status, 401);
    assert.match(
      unauthorized.headers.get("www-authenticate")!,
      /oauth-protected-resource/,
    );
    const key = await f.grant(),
      client = await f.client(key.token);
    const projects = await f.call(client, "list_projects");
    assert.deepEqual(
      projects.body.map((p: { id: string }) => p.id),
      [f.project.id],
    );
    assert.equal(
      (await f.call(client, "get_project", { projectId: f.other.id })).error,
      true,
    );
    assert.ok(
      !(await client.listTools()).tools.some(
        (tool) => tool.name === "create_text_file",
      ),
    );
    const write = await f.grant(true),
      writer = await f.client(write.token);
    const created = await f.call(writer, "create_text_file", {
      projectId: f.project.id,
      path: "proposal/index.html",
      content: "<h1>First</h1>",
      mime: "text/html",
    });
    assert.equal(created.error, false, JSON.stringify(created));
    const fileId = created.body.id;
    const read = await f.call(client, "read_text_file", { fileId });
    assert.equal(read.body.text, "<h1>First</h1>");
    assert.equal(
      (
        await f.call(writer, "update_text_file", {
          fileId,
          expectedVersion: 1,
          content: "<h1>Second</h1>",
        })
      ).error,
      false,
    );
    assert.equal(
      (
        await f.call(writer, "update_text_file", {
          fileId,
          expectedVersion: 1,
          content: "Stale",
        })
      ).error,
      true,
    );
    const comment = await f.call(writer, "add_comment", {
      projectId: f.project.id,
      body: "Review ready",
      fileId,
    });
    assert.match(comment.body.author, /via Test AI/);
    assert.equal(
      (
        await f.call(writer, "create_question", {
          projectId: f.project.id,
          prompt: "Approve?",
          type: "approval",
        })
      ).error,
      false,
    );
    const search = await f.call(client, "search", { query: "proposal" });
    assert.equal(search.body.results[0].id, `file:${fileId}`);
    assert.equal(
      (await f.call(client, "fetch", { id: `file:${fileId}` })).body.text,
      "<h1>Second</h1>",
    );
    await f.ok(
      `/projects/${f.project.id}`,
      "PATCH",
      { status: "locked" },
      f.owner,
    );
    assert.equal(
      (
        await f.call(writer, "add_comment", {
          projectId: f.project.id,
          body: "Blocked",
        })
      ).error,
      true,
    );
    const foreign = await f.fetch(`${f.platform.origin}/api/mcp`, {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        Authorization: `Bearer ${key.token}`,
      },
      body: "{}",
    });
    assert.equal(foreign.status, 403);
    assert.equal(
      (
        await f.fetch(`${f.platform.origin}/api/projects`, {
          method: "POST",
          headers: { Cookie: f.owner, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "CSRF" }),
        })
      ).status,
      403,
    );
    await f.ok(
      `/connections/${key.connection.id}`,
      "DELETE",
      undefined,
      f.owner,
    );
    assert.equal(
      (
        await f.fetch(`${f.platform.origin}/api/mcp`, {
          headers: { Authorization: `Bearer ${key.token}` },
        })
      ).status,
      401,
    );
    await f.platform.db
      .update(s.connections)
      .set({ expiresAt: Date.now() - 1 })
      .where(eq(s.connections.id, write.connection.id));
    assert.equal(
      (
        await f.fetch(`${f.platform.origin}/api/mcp`, {
          headers: { Authorization: `Bearer ${write.token}` },
        })
      ).status,
      401,
    );
    await client.close();
    await writer.close();
  } finally {
    await f.cleanup();
  }
});

test("connector access follows membership changes and account disablement", async () => {
  const f = await connectorFixture();
  try {
    const person = await f.ok(
      "/people",
      "POST",
      {
        name: "Editor",
        email: "editor@example.test",
        password: "Editor-password-123",
        role: "member",
      },
      f.owner,
    );
    await f.ok(
      `/projects/${f.project.id}/members`,
      "PUT",
      { email: "editor@example.test", role: "editor" },
      f.owner,
    );
    const session = f.cookie(
      await f.req("/auth/sign-in/email", "POST", {
        email: "editor@example.test",
        password: "Editor-password-123",
      }),
    );
    assert.equal(
      (
        await f.req(
          "/connections",
          "POST",
          { label: "Too broad", projectIds: [f.other.id] },
          session,
        )
      ).status,
      403,
    );
    const grant = await f.grant(true, session),
      client = await f.client(grant.token);
    assert.equal(
      (
        await f.call(client, "create_question", {
          projectId: f.project.id,
          prompt: "Not admin",
          type: "text",
        })
      ).error,
      true,
    );
    await f.ok(
      `/projects/${f.project.id}/members`,
      "PUT",
      { email: "editor@example.test", role: "viewer" },
      f.owner,
    );
    assert.equal(
      (
        await f.call(client, "create_text_file", {
          projectId: f.project.id,
          path: "blocked.txt",
          content: "No",
        })
      ).error,
      true,
    );
    await f.ok(
      `/projects/${f.project.id}/members/${person.id}`,
      "DELETE",
      undefined,
      f.owner,
    );
    assert.deepEqual((await f.call(client, "list_projects")).body, []);
    assert.equal(
      (await f.call(client, "get_project", { projectId: f.project.id })).error,
      true,
    );
    await f.platform.db
      .update(s.user)
      .set({ disabled: true })
      .where(eq(s.user.id, person.id));
    assert.equal(
      (
        await f.fetch(`${f.platform.origin}/api/mcp`, {
          headers: { Authorization: `Bearer ${grant.token}` },
        })
      ).status,
      401,
    );
    await client.close();
  } finally {
    await f.cleanup();
  }
});
