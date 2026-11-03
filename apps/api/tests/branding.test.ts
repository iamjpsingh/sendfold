import test from "node:test";
import assert from "node:assert/strict";
import { defaultBranding } from "@sendfold/shared/branding";
import { app } from "../src/app";
import { releaseFixture } from "./release-fixture";

test("branding is public to read, admin-only to change, safe to render and persists", async () => {
  const f = await releaseFixture();
  try {
    assert.deepEqual(await f.ok("/branding"), defaultBranding);
    const fields = {
      ...defaultBranding,
      name: "My Studio",
      poweredByEnabled: true,
      poweredByName: "Imapro",
    };
    assert.equal((await f.req("/branding", "PATCH", fields)).status, 401);
    assert.equal(
      (await f.req("/branding", "PATCH", fields, f.member)).status,
      403,
    );
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "http://example.com",
      "https://user:pass@example.com",
    ]) {
      assert.equal(
        (
          await f.req(
            "/branding",
            "PATCH",
            { ...fields, poweredByUrl: url },
            f.owner,
          )
        ).status,
        400,
      );
    }
    await f.ok("/branding", "PATCH", fields, f.owner);
    assert.equal((await f.ok("/branding")).name, "My Studio");
    const form = new FormData();
    form.set(
      "file",
      new File(["<svg onload='alert(1)'></svg>"], "logo.png", {
        type: "image/png",
      }),
    );
    assert.equal(
      (await f.req("/branding/logo", "POST", form, f.owner)).status,
      400,
    );
    const png = new FormData();
    png.set(
      "file",
      new File(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR9sAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        "logo.png",
        { type: "image/png" },
      ),
    );
    assert.equal(
      (await f.req("/branding/logo", "POST", png, f.member)).status,
      403,
    );
    const [logo] = await Promise.all([
      f.ok("/branding/logo", "POST", png, f.owner),
      f.ok(
        "/branding",
        "PATCH",
        { ...fields, tagline: "Updated together" },
        f.owner,
      ),
    ]);
    const saved = await f.ok("/branding");
    assert.equal(saved.tagline, "Updated together");
    assert.equal(saved.logoId, logo.logoId);
    const response = await f.req(`/branding/logo/${saved.logoId}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(response.headers.get("Content-Security-Policy")!, /sandbox/);
    const connector = await app.fetch(
      new Request(`${f.platform.origin}/api/branding`, {
        method: "PATCH",
        headers: {
          Origin: f.platform.origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fields),
      }),
      {
        platform: f.platform,
        connector: {
          id: "fake",
          userId: (await f.ok("/me", "GET", undefined, f.owner)).user.id,
          label: "AI",
          projectIds: [f.project.id],
          allowWrite: true,
        },
      },
    );
    assert.equal(connector.status, 403);
    await f.ok("/branding/logo", "DELETE", undefined, f.owner);
    assert.equal((await f.ok("/branding")).logoId, null);
    assert.equal((await f.req(`/branding/logo/${saved.logoId}`)).status, 404);
  } finally {
    await f.cleanup();
  }
});
