import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture";

test("per-project roles, directory isolation, revocation and disabled accounts", async () => {
  const { req, ok, cookie, cleanup } = await fixture();
  try {
    await ok("/setup", "POST", {
      token: "test-setup-token",
      installation: "Studio",
      name: "Owner",
      email: "owner@example.test",
      password: "Owner-password-123",
    });
    const login = async (email: string) =>
      cookie(
        await req("/auth/sign-in/email", "POST", {
          email,
          password: "Owner-password-123",
        }),
      );
    const owner = await login("owner@example.test");
    const teammate = await ok(
      "/people",
      "POST",
      {
        name: "Teammate",
        email: "team@example.test",
        password: "Owner-password-123",
      },
      owner,
    );
    const second = await ok(
      "/people",
      "POST",
      {
        name: "Second",
        email: "second@example.test",
        password: "Owner-password-123",
      },
      owner,
    );
    const team = await login("team@example.test");
    const a = await ok("/projects", "POST", { name: "Project A" }, owner);
    const b = await ok("/projects", "POST", { name: "Project B" }, owner);
    const hidden = await ok(
      "/projects",
      "POST",
      { name: "Private project" },
      owner,
    );
    assert.equal(
      (await req("/workspaces", "POST", { name: "Not a SaaS" }, owner)).status,
      404,
    );
    assert.equal(
      (await req("/projects", "POST", { name: "Not allowed" }, team)).status,
      403,
    );
    assert.deepEqual(await ok("/projects", "GET", undefined, team), []);
    const assign = (
      project: string,
      role: string,
      session = owner,
      email = "team@example.test",
    ) => ok(`/projects/${project}/members`, "PUT", { email, role }, session);
    await assign(a.id, "editor");
    await assign(b.id, "viewer");
    const listed = await ok("/projects", "GET", undefined, team);
    assert.deepEqual(
      listed.map((p: { id: string }) => p.id).sort(),
      [a.id, b.id].sort(),
    );
    assert.equal(
      (await req(`/projects/${hidden.id}`, "GET", undefined, team)).status,
      403,
    );
    const form = () => {
      const data = new FormData();
      data.set("file", new File(["private content"], "proposal.txt"));
      data.set("path", "proposal.txt");
      return data;
    };
    const file = await ok(`/projects/${a.id}/files`, "POST", form(), team);
    assert.equal(
      (await req(`/projects/${b.id}/files`, "POST", form(), team)).status,
      403,
    );
    assert.equal(
      (await req(`/projects/${a.id}/members`, "GET", undefined, team)).status,
      403,
    );
    assert.equal(
      (await req(`/projects/${a.id}`, "PATCH", { status: "locked" }, team))
        .status,
      403,
    );
    assert.equal(
      (
        await req(
          `/projects/${b.id}/comments`,
          "POST",
          { body: "Blocked" },
          team,
        )
      ).status,
      403,
    );
    await ok(
      `/projects/${a.id}/comments`,
      "POST",
      { body: "Editor feedback" },
      team,
    );
    await assign(a.id, "admin");
    await assign(a.id, "viewer", team, "second@example.test");
    const members = await ok(
      `/projects/${a.id}/members`,
      "GET",
      undefined,
      team,
    );
    assert.equal(members.length, 2);
    assert.equal((await req("/people", "GET", undefined, team)).status, 403);
    assert.equal(
      (
        await req(
          "/people",
          "POST",
          {
            name: "Escalate",
            email: "bad@example.test",
            password: "Owner-password-123",
            role: "super_admin",
          },
          team,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await req(
          `/projects/${b.id}/members`,
          "PUT",
          { email: "second@example.test", role: "admin" },
          team,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await req(
          `/projects/${a.id}/members`,
          "PUT",
          { email: "team@example.test", role: "viewer" },
          team,
        )
      ).status,
      400,
    );
    await ok(`/projects/${a.id}`, "PATCH", { status: "locked" }, team);
    await ok(`/projects/${a.id}`, "PATCH", { status: "active" }, team);
    const activity = await ok("/activity", "GET", undefined, team);
    assert.ok(activity.length > 0);
    assert.ok(
      activity.every((entry: { projectId: string }) =>
        [a.id, b.id].includes(entry.projectId),
      ),
    );
    assert.equal(
      (await req(`/files/${file.id}/content`, "GET", undefined, team)).status,
      200,
    );
    await ok(
      `/projects/${a.id}/members/${teammate.id}`,
      "DELETE",
      undefined,
      owner,
    );
    assert.equal(
      (await req(`/files/${file.id}/content`, "GET", undefined, team)).status,
      403,
    );
    assert.equal(
      (await req(`/files/${file.id}/versions`, "GET", undefined, team)).status,
      403,
    );
    assert.equal(
      (await req(`/projects/${a.id}`, "GET", undefined, team)).status,
      403,
    );
    const remaining = await ok("/activity", "GET", undefined, team);
    assert.ok(
      remaining.every(
        (entry: { projectId: string }) => entry.projectId === b.id,
      ),
    );
    const secondCookie = await login("second@example.test");
    assert.equal(
      (await req(`/files/${file.id}/content`, "GET", undefined, secondCookie))
        .status,
      200,
    );
    await ok(`/people/${second.id}`, "PATCH", { disabled: true }, owner);
    assert.equal(
      (await req(`/files/${file.id}/content`, "GET", undefined, secondCookie))
        .status,
      401,
    );
    assert.equal(
      (await req(`/projects/${hidden.id}`, "GET", undefined, owner)).status,
      200,
    );
  } finally {
    await cleanup();
  }
});
