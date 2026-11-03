import test from "node:test";
import assert from "node:assert/strict";
import SQLite from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot } from "../src/node-platform";
import { releaseFixture } from "./release-fixture";

test("migration preserves earlier activity without fabricating visitor metadata", () => {
  const db = new SQLite(":memory:");
  try {
    const directory = resolve(repoRoot, "packages/database/migrations");
    const files = readdirSync(directory)
      .filter((p) => p.endsWith(".sql"))
      .sort();
    for (const file of files.filter((p) => p < "0005"))
      db.exec(readFileSync(resolve(directory, file), "utf8"));
    db.exec(`INSERT INTO workspaces(id, name, created_at) VALUES('installation', 'Legacy installation', 1);
      INSERT INTO user(id, name, email, created_at, updated_at) VALUES('owner', 'Owner', 'owner@example.test', 1, 1);
      INSERT INTO projects(id, workspace_id, created_by, name, created_at, updated_at)
      VALUES('project', 'installation', 'owner', 'Legacy project', 1, 1);
      INSERT INTO activities(id, workspace_id, project_id, author, action, detail, created_at)
      VALUES('old-event', 'installation', 'project', 'Earlier Guest', 'answered', 'Question one', 123);`);
    db.exec(
      readFileSync(
        resolve(
          directory,
          files.find((p) => p.startsWith("0005"))!,
        ),
        "utf8",
      ),
    );
    const row = db.prepare("SELECT * FROM audit_events").get() as Record<
      string,
      unknown
    >;
    assert.equal(row.id, "old-event");
    assert.equal(row.created_at, 123);
    assert.equal(row.actor_kind, "legacy");
    assert.equal(row.actor_name, "Earlier Guest");
    for (const key of ["ip_address", "actor_email", "user_agent", "share_id"])
      assert.equal(row[key], null);
  } finally {
    db.close();
  }
});

test("anonymous visits and failed unlocks are recorded without granting file or admin access", async () => {
  const f = await releaseFixture();
  try {
    const file = await f.upload("shared.txt"),
      sibling = await f.upload("private.txt");
    const { share, guest, query } = await f.share({ fileId: file.id });
    const root = `/projects/${f.project.id}`;
    const visit = await f.req(`/shared/${share.token}/session`);
    assert.equal(visit.status, 401);
    const anonymous = f.cookie(visit);
    assert(anonymous.includes(`sf_visit_${share.id}=`));
    assert(!anonymous.includes(`sf_${share.id}=`));
    await f.req(`/shared/${share.token}/session`, "GET", undefined, anonymous);
    for (let i = 0; i < 7; i++) {
      const response = await f.req(
        `/shared/${share.token}/unlock`,
        "POST",
        { password: "wrong" },
        anonymous,
      );
      assert.equal(response.status, i < 5 ? 401 : 429);
    }
    assert.equal(
      (
        await f.req(
          `/files/${file.id}/visit${query}`,
          "POST",
          { mode: "full" },
          anonymous,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await f.req(
          `/files/${sibling.id}/visit${query}`,
          "POST",
          { mode: "full" },
          guest,
        )
      ).status,
      403,
    );
    const result = await f.ok(`${root}/audit`, "GET", undefined, f.owner);
    assert.equal(
      result.events.filter((e: any) => e.action === "opened link").length,
      1,
    );
    assert.equal(
      result.events.filter((e: any) => e.action === "unlock failed").length,
      5,
    );
    assert.equal(
      result.events.filter((e: any) => e.action === "unlock blocked").length,
      1,
    );
    assert(!result.events.some((e: any) => e.action === "opened full view"));
    const people = await f.ok(
      `${root}/visitors?search=Anonymous`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(people.total, 1);
    assert.equal(people.visitors[0].actorKind, "anonymous");
    assert.equal(people.visitors[0].eventCount, 7);
    assert.equal((await f.req("/audit/projects")).status, 401);
    assert.deepEqual(
      await f.ok("/audit/projects", "GET", undefined, f.member),
      [],
    );
    assert.equal(
      (await f.ok("/audit/projects", "GET", undefined, f.owner)).length,
      1,
    );
    await f.ok(
      `${root}/members`,
      "PUT",
      { email: "member@example.test", role: "admin" },
      f.owner,
    );
    assert.equal(
      (await f.ok("/audit/projects", "GET", undefined, f.member))[0].id,
      f.project.id,
    );
  } finally {
    await f.cleanup();
  }
});
