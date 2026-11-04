import test from "node:test";
import assert from "node:assert/strict";
import { auditEvents } from "@sendfold/database/schema";
import { releaseFixture } from "./release-fixture";

test("visitor filters operate before pagination and preserve lifetime counts with latest metadata", async () => {
  const f = await releaseFixture();
  try {
    const root = `/projects/${f.project.id}`,
      time = Date.now() - 86400000;
    const events = Array.from({ length: 60 }, (_, i) => ({
      id: crypto.randomUUID(),
      projectId: f.project.id,
      actorKey: `guest:test-${i}`,
      actorKind: "guest" as const,
      actorName: `Visitor ${i}`,
      actorEmail: `v${i}@example.test`,
      country: i % 2 ? "US" : "IN",
      ipAddress: `192.0.2.${i + 1}`,
      action: "viewed project",
      detail: "Synthetic visit",
      createdAt: time + i,
    }));
    events.push({
      ...events[0],
      id: crypto.randomUUID(),
      country: "GB",
      createdAt: time - 100,
    });
    events.push({
      ...events[0],
      id: crypto.randomUUID(),
      ipAddress: "198.51.100.9",
      createdAt: time + 100,
    });
    await f.platform.db.insert(auditEvents).values(events);
    await f.platform.db.insert(auditEvents).values({
      ...events[0],
      id: crypto.randomUUID(),
      actorKey: "anonymous:unknown-country",
      actorKind: "anonymous",
      actorName: "Anonymous",
      country: "XX",
    });
    const unknown = await f.ok(
      `${root}/visitors?kind=anonymous&country=unknown`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(unknown.total, 1);
    const first = await f.ok(
      `${root}/visitors?kind=guest`,
      "GET",
      undefined,
      f.owner,
    );
    const second = await f.ok(
      `${root}/visitors?kind=guest&offset=50`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(first.total, 60);
    assert.equal(first.visitors.length, 50);
    assert.equal(second.visitors.length, 10);
    assert.equal(
      new Set([...first.visitors, ...second.visitors].map((v) => v.actorKey))
        .size,
      60,
    );
    const india = await f.ok(
      `${root}/visitors?kind=guest&country=IN&sort=events`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(india.total, 30);
    assert(india.visitors.every((v: any) => v.country === "IN"));
    assert.equal(india.visitors[0].actorName, "Visitor 0");
    assert.equal(india.visitors[0].eventCount, 3);
    assert.equal(india.visitors[0].firstSeen, time - 100);
    assert.equal(india.visitors[0].lastSeen, time + 100);
    const ip = await f.ok(
      `${root}/visitors?search=198.51.100.9`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(ip.total, 1);
    assert.equal(ip.visitors[0].eventCount, 3);
    assert.equal(
      (await f.ok(`${root}/visitors?country=GB`, "GET", undefined, f.owner))
        .total,
      0,
    );
    assert.equal(
      (
        await f.ok(
          `${root}/visitors?kind=guest&from=${time + 99}`,
          "GET",
          undefined,
          f.owner,
        )
      ).total,
      1,
    );
    const audit = await f.ok(
      `${root}/audit?country=GB&kind=guest`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(audit.total, 1);
    assert.equal(audit.events[0].country, "GB");
    assert.deepEqual(audit.countries, ["GB", "IN", "US"]);
    assert.equal(
      (
        await f.ok(
          `${root}/audit?kind=member&country=unknown`,
          "GET",
          undefined,
          f.owner,
        )
      ).total,
      1,
    );
    for (const route of ["audit", "visitors"])
      assert.equal(
        (
          await f.req(
            `${root}/${route}?country=invalid`,
            "GET",
            undefined,
            f.owner,
          )
        ).status,
        400,
      );
  } finally {
    await f.cleanup();
  }
});
