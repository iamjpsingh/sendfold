import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app";
import { fixture } from "./fixture";

test("accounts, project isolation, password shares, feedback, locks and revocation", async () => {
  const { platform, req, ok, cookie, cleanup } = await fixture();
  try {
    assert.equal((await req("/projects")).status, 401);
    assert.equal(
      (
        await req("/setup", "POST", {
          token: "wrong",
          name: "Owner",
          installation: "Studio",
          email: "owner@example.test",
          password: "Owner-password-123",
        })
      ).status,
      403,
    );
    await ok("/setup", "POST", {
      token: "test-setup-token",
      name: "Owner",
      installation: "Studio",
      email: "owner@example.test",
      password: "Owner-password-123",
    });
    assert.equal(
      (
        await req("/setup", "POST", {
          token: "test-setup-token",
          name: "Other",
          installation: "Other",
          email: "other@example.test",
          password: "Owner-password-123",
        })
      ).status,
      409,
    );
    const owner = cookie(
      await req("/auth/sign-in/email", "POST", {
        email: "owner@example.test",
        password: "Owner-password-123",
      }),
    );
    assert.ok(owner);
    const me = await ok("/me", "GET", undefined, owner);
    assert.equal(me.user.role, "super_admin");
    assert.equal(
      (
        await req("/auth/sign-up/email", "POST", {
          name: "Attacker",
          email: "a@example.test",
          password: "attacker-password",
          role: "super_admin",
        })
      ).status,
      403,
    );
    await ok(
      "/people",
      "POST",
      {
        name: "Member",
        email: "member@example.test",
        password: "Member-password-123",
        role: "member",
      },
      owner,
    );
    const member = cookie(
      await req("/auth/sign-in/email", "POST", {
        email: "member@example.test",
        password: "Member-password-123",
      }),
    );
    const project = await ok(
      "/projects",
      "POST",
      { name: "Private proposal" },
      owner,
    );
    assert.equal(
      (await req(`/projects/${project.id}`, "GET", undefined, member)).status,
      403,
    );
    assert.equal((await req("/people", "GET", undefined, member)).status, 403);
    const form = new FormData();
    form.set("file", new File(["secret proposal"], "proposal.txt"));
    form.set("path", "proposal.txt");
    const file = await ok(`/projects/${project.id}/files`, "POST", form, owner);
    assert.equal((await req(`/files/${file.id}/content`)).status, 401);
    const share = await ok(
      `/projects/${project.id}/shares`,
      "POST",
      {
        label: "Client review",
        password: "Client-password-123",
        permission: "comment",
        allowDownload: false,
        allowUpload: false,
        expiresAt: null,
      },
      owner,
    );
    const unlock = await req(`/shared/${share.token}/unlock`, "POST", {
      name: "Client",
      password: "Client-password-123",
    });
    assert.equal(unlock.status, 200);
    const guest = cookie(unlock);
    assert.equal(
      (await req(`/shared/${share.token}/session`, "GET", undefined, guest))
        .status,
      200,
    );
    assert.equal(
      (
        await req(
          `/files/${file.id}/content?share=${share.token}`,
          "GET",
          undefined,
          guest,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await req(
          `/files/${file.id}/content?share=${share.token}&download=1`,
          "GET",
          undefined,
          guest,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await req(
          `/files/${file.id}/lease?share=${share.token}`,
          "POST",
          {},
          guest,
        )
      ).status,
      403,
    );
    await ok(
      `/projects/${project.id}/comments?share=${share.token}`,
      "POST",
      { body: "Looks good", fileId: file.id },
      guest,
    );
    const question = await ok(
      `/projects/${project.id}/questions`,
      "POST",
      { prompt: "Approve?", type: "approval" },
      owner,
    );
    await ok(
      `/questions/${question.id}/answer?share=${share.token}`,
      "PUT",
      { value: "Approved" },
      guest,
    );
    const listing = await ok("/projects", "GET", undefined, owner);
    const summary = listing.find(
      (item: { id: string }) => item.id === project.id,
    );
    assert.equal(summary.fileCount, 1);
    assert.equal(summary.commentCount, 1);
    assert.equal(summary.shareCount, 1);
    await ok(`/projects/${project.id}`, "PATCH", { status: "locked" }, owner);
    assert.equal(
      (
        await req(
          `/projects/${project.id}/comments?share=${share.token}`,
          "POST",
          { body: "After lock" },
          guest,
        )
      ).status,
      403,
    );
    await ok(`/shares/${share.id}`, "DELETE", undefined, owner);
    assert.equal(
      (
        await req(
          `/files/${file.id}/content?share=${share.token}`,
          "GET",
          undefined,
          guest,
        )
      ).status,
      403,
    );
    const crossOrigin = await app.fetch(
      new Request("http://localhost:5173/api/projects", {
        method: "POST",
        headers: {
          Origin: "https://evil.test",
          Cookie: owner,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Bad" }),
      }),
      { platform },
    );
    assert.equal(crossOrigin.status, 403);
  } finally {
    await cleanup();
  }
});
