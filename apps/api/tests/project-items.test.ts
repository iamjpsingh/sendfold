import test from "node:test";
import assert from "node:assert/strict";
import { releaseFixture } from "./release-fixture";

test("project resources enforce safe URLs, roles, task completion and project locks", async () => {
  const f = await releaseFixture();
  try {
    const path = `/projects/${f.project.id}/items`;
    assert.equal(
      (await f.req(path, "POST", { type: "task", title: "Blocked" }, f.member))
        .status,
      403,
    );
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "file:///etc/passwd",
      "https://user:pass@example.com",
    ])
      assert.equal(
        (
          await f.req(
            path,
            "POST",
            { type: "link", title: "Bad", url },
            f.owner,
          )
        ).status,
        400,
      );
    const link = await f.ok(
      path,
      "POST",
      {
        type: "link",
        title: "Reference",
        url: "https://example.com",
        important: true,
        note: "Review first",
      },
      f.owner,
    );
    const task = await f.ok(
      path,
      "POST",
      { type: "task", title: "Approve proposal" },
      f.owner,
    );
    const { guest, query } = await f.share();
    assert.equal(
      (
        await f.req(
          path + query,
          "POST",
          { type: "task", title: "Blocked" },
          guest,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.req(
          `/items/${task.id}${query}`,
          "PATCH",
          { completed: true, important: true },
          guest,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.req(
          `/items/${link.id}${query}`,
          "PATCH",
          { completed: true },
          guest,
        )
      ).status,
      403,
    );
    await f.ok(
      `/items/${task.id}${query}`,
      "PATCH",
      { completed: true },
      guest,
    );
    await f.ok(`/items/${link.id}`, "PATCH", { important: false }, f.owner);
    const detail = await f.ok(
      `/projects/${f.project.id}${query}`,
      "GET",
      undefined,
      guest,
    );
    assert.equal(detail.items.length, 2);
    assert.equal(
      detail.items.find((x: { id: string }) => x.id === task.id).completed,
      true,
    );
    assert.equal(
      detail.items.find((x: { id: string }) => x.id === link.id).important,
      false,
    );
    const viewer = await f.share({ permission: "view" });
    assert.equal(
      (
        await f.req(
          `/items/${task.id}${viewer.query}`,
          "PATCH",
          { completed: false },
          viewer.guest,
        )
      ).status,
      403,
    );
    await f.ok(
      `/projects/${f.project.id}`,
      "PATCH",
      { status: "locked" },
      f.owner,
    );
    assert.equal(
      (
        await f.req(
          `/items/${task.id}${query}`,
          "PATCH",
          { completed: false },
          guest,
        )
      ).status,
      403,
    );
    assert.equal(
      (await f.req(path, "POST", { type: "task", title: "Blocked" }, f.owner))
        .status,
      403,
    );
  } finally {
    await f.cleanup();
  }
});
