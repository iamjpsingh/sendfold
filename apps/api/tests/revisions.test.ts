import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture";
test("exclusive editor lease, optimistic revisions, and original-file retention", async () => {
  const { ok, req, cookie, cleanup } = await fixture();
  try {
    await ok("/setup", "POST", {
      token: "test-setup-token",
      name: "Owner",
      installation: "Studio",
      email: "owner@example.test",
      password: "Owner-password-123",
    });
    const owner = cookie(
      await req("/auth/sign-in/email", "POST", {
        email: "owner@example.test",
        password: "Owner-password-123",
      }),
    );
    const project = await ok(
      "/projects",
      "POST",
      { name: "Editing test" },
      owner,
    );
    const upload = new FormData();
    upload.set("file", new File(["original"], "notes.txt"));
    const file = await ok(
      `/projects/${project.id}/files`,
      "POST",
      upload,
      owner,
    );
    const share = await ok(
      `/projects/${project.id}/shares`,
      "POST",
      {
        label: "Editor",
        password: "Guest-password-123",
        permission: "edit",
        allowDownload: true,
        allowUpload: true,
        expiresAt: null,
      },
      owner,
    );
    const guest = cookie(
      await req(`/shared/${share.token}/unlock`, "POST", {
        password: "Guest-password-123",
        name: "Guest editor",
      }),
    );
    const suffix = `?share=${share.token}`;
    const revision = (value: string, version = 1) => {
      const form = new FormData();
      form.set("file", new File([value], "notes.txt"));
      form.set("version", String(version));
      return form;
    };
    assert.equal(
      (
        await req(
          `/files/${file.id}/revisions`,
          "POST",
          revision("unlocked"),
          owner,
        )
      ).status,
      409,
    );
    await ok(`/files/${file.id}/lease`, "POST", {}, owner);
    assert.equal(
      (await req(`/files/${file.id}/lease${suffix}`, "POST", {}, guest)).status,
      409,
    );
    const saved = await ok(
      `/files/${file.id}/revisions`,
      "POST",
      revision("revision two"),
      owner,
    );
    assert.equal(saved.version, 2);
    assert.equal(
      (
        await req(
          `/files/${file.id}/revisions`,
          "POST",
          revision("stale"),
          owner,
        )
      ).status,
      409,
    );
    assert.equal(
      await (
        await req(
          `/files/${file.id}/content?version=1`,
          "GET",
          undefined,
          owner,
        )
      ).text(),
      "original",
    );
    assert.equal(
      await (
        await req(`/files/${file.id}/content`, "GET", undefined, owner)
      ).text(),
      "revision two",
    );
    await ok(`/files/${file.id}/lease`, "DELETE", undefined, owner);
    await ok(`/files/${file.id}/lease${suffix}`, "POST", {}, guest);
    const races = await Promise.all([
      req(
        `/files/${file.id}/revisions${suffix}`,
        "POST",
        revision("A", 2),
        guest,
      ),
      req(
        `/files/${file.id}/revisions${suffix}`,
        "POST",
        revision("B", 2),
        guest,
      ),
    ]);
    assert.deepEqual(races.map((r) => r.status).sort(), [200, 409]);
    const versions = await ok(
      `/files/${file.id}/versions`,
      "GET",
      undefined,
      owner,
    );
    assert.equal(versions.length, 3);
    const badPath = new FormData();
    badPath.set("file", new File(["x"], "x"));
    badPath.set("path", "../secret");
    assert.equal(
      (await req(`/projects/${project.id}/files`, "POST", badPath, owner))
        .status,
      400,
    );
  } finally {
    await cleanup();
  }
});
