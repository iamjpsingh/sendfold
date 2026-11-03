import test from "node:test";
import assert from "node:assert/strict";
import { releaseFixture } from "./release-fixture";

test("single-file links restrict previews, versions, edits, feedback and project data", async () => {
  const f = await releaseFixture();
  try {
    const file = await f.upload("proposal.html", "<h1>Proposal</h1>"),
      other = await f.upload("private.txt", "Private");
    assert.equal(
      (
        await f.req(
          `/projects/${f.project.id}/questions`,
          "POST",
          { prompt: "Pick one", type: "single", options: ["Mobile", "mobile"] },
          f.owner,
        )
      ).status,
      400,
    );
    const q = await f.ok(
      `/projects/${f.project.id}/questions`,
      "POST",
      { prompt: "Approve?", type: "approval" },
      f.owner,
    );
    const item = await f.ok(
      `/projects/${f.project.id}/items`,
      "POST",
      { type: "task", title: "Private task" },
      f.owner,
    );
    await f.ok(
      `/projects/${f.project.id}/comments`,
      "POST",
      { body: "Private conversation" },
      f.owner,
    );
    await f.ok(
      `/projects/${f.project.id}/comments`,
      "POST",
      { body: "File feedback", fileId: file.id },
      f.owner,
    );
    const { share, guest, query } = await f.share({
      fileId: file.id,
      viewMode: "full",
      permission: "edit",
    });
    assert.equal(share.allowUpload, false);
    const session = await f.ok(
      `/shared/${share.token}/session`,
      "GET",
      undefined,
      guest,
    );
    assert.deepEqual(session, {
      projectId: f.project.id,
      fileId: file.id,
      viewMode: "full",
    });
    const detail = await f.ok(
      `/projects/${f.project.id}${query}`,
      "GET",
      undefined,
      guest,
    );
    assert.deepEqual(
      detail.files.map((v: { id: string }) => v.id),
      [file.id],
    );
    assert.equal(detail.project.description, "");
    assert.deepEqual(detail.questions, []);
    assert.deepEqual(detail.answers, []);
    assert.deepEqual(detail.activities, []);
    assert.deepEqual(detail.items, []);
    assert.equal(detail.comments.length, 1);
    assert.equal(detail.comments[0].fileId, file.id);
    for (const suffix of [
      "content",
      "content?version=1",
      "versions",
      "workbook",
    ]) {
      const separator = suffix.includes("?") ? "&" : "?";
      assert.equal(
        (
          await f.req(
            `/files/${file.id}/${suffix}${separator}share=${share.token}`,
            "GET",
            undefined,
            guest,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await f.req(
            `/files/${other.id}/${suffix}${separator}share=${share.token}`,
            "GET",
            undefined,
            guest,
          )
        ).status,
        403,
      );
    }
    assert.equal(
      (await f.req(`/files/${other.id}/lease${query}`, "POST", {}, guest))
        .status,
      403,
    );
    await f.ok(`/files/${file.id}/lease${query}`, "POST", {}, guest);
    assert.equal(
      (
        await f.req(
          `/projects/${f.project.id}/files${query}`,
          "POST",
          new FormData(),
          guest,
        )
      ).status,
      403,
    );
    for (const fileId of [null, other.id])
      assert.equal(
        (
          await f.req(
            `/projects/${f.project.id}/comments${query}`,
            "POST",
            { body: "Blocked", fileId },
            guest,
          )
        ).status,
        403,
      );
    await f.ok(
      `/projects/${f.project.id}/comments${query}`,
      "POST",
      { body: "Allowed", fileId: file.id },
      guest,
    );
    assert.equal(
      (
        await f.req(
          `/questions/${q.id}/answer${query}`,
          "PUT",
          { value: "Approved" },
          guest,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.req(
          `/projects/${f.project.id}/items${query}`,
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
          `/items/${item.id}${query}`,
          "PATCH",
          { completed: true },
          guest,
        )
      ).status,
      403,
    );
    const whole = await f.share();
    assert.equal(whole.share.fileId, null);
    assert.equal(
      (
        await f.ok(
          `/projects/${f.project.id}${whole.query}`,
          "GET",
          undefined,
          whole.guest,
        )
      ).files.length,
      2,
    );
    assert.equal(
      (
        await f.req(
          `/files/${other.id}/content${query}`,
          "GET",
          undefined,
          f.owner,
        )
      ).status,
      200,
    );
    const outside = await f.ok("/projects", "POST", { name: "Other" }, f.owner);
    const outsideFile = await f.upload("outside.txt", "Outside", outside.id);
    assert.equal(
      (
        await f.req(
          `/projects/${f.project.id}/shares`,
          "POST",
          { ...share, fileId: outsideFile.id, password: "Guest-password-123" },
          f.owner,
        )
      ).status,
      400,
    );
    await f.ok(`/shares/${share.id}`, "DELETE", undefined, f.owner);
    assert.equal(
      (
        await f.req(
          `/files/${file.id}/content${query}`,
          "GET",
          undefined,
          guest,
        )
      ).status,
      403,
    );
  } finally {
    await f.cleanup();
  }
});
