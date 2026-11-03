import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { auditEvents } from "@sendfold/database/schema";
import { releaseFixture } from "./release-fixture";
import { app } from "../src/app";
import { requestInfo, cloudflareRequestInfo } from "../src/audit/request-info";

test("admin response and activity history preserves guest identity, isolates permissions and paginates", async () => {
  const f = await releaseFixture();
  try {
    const root = `/projects/${f.project.id}`;
    const q = await f.ok(
      `${root}/questions`,
      "POST",
      { prompt: "Approve the proposal?", type: "approval" },
      f.owner,
    );
    const file = await f.upload("proposal.html", "<h1>Proposal</h1>");
    f.platform.requestInfo = {
      ipAddress: "192.0.2.25",
      country: "IN",
      userAgent: "Synthetic browser",
    };
    const { share, guest, query } = await f.share();
    const unlock = await f.req(`/shared/${share.token}/unlock`, "POST", {
      password: "Guest-password-123",
      name: "Review Guest",
      email: "review@example.test",
    });
    const respondent = f.cookie(unlock);
    await f.ok(
      `/questions/${q.id}/answer${query}`,
      "PUT",
      { value: "Approved" },
      respondent,
    );
    await f.ok(
      `/files/${file.id}/visit${query}`,
      "POST",
      { mode: "full" },
      respondent,
    );
    await f.req(
      `/files/${file.id}/content${query}&download=1`,
      "GET",
      undefined,
      respondent,
    );
    await f.ok(
      `${root}/comments${query}`,
      "POST",
      { body: "Looks good" },
      respondent,
    );
    await f.ok(root + query, "GET", undefined, respondent);
    await f.ok(root + query, "GET", undefined, respondent);
    const events = await f.ok(`${root}/audit`, "GET", undefined, f.owner);
    const saved = events.events.find((e: any) => e.action === "answered");
    assert.equal(saved.actorName, "Review Guest");
    assert.equal(saved.actorEmail, "review@example.test");
    assert.equal(saved.actorKind, "guest");
    assert.equal(saved.ipAddress, "192.0.2.25");
    assert.equal(saved.resourceId, q.id);
    assert.equal(
      events.events.filter(
        (e: any) =>
          e.action === "viewed project" && e.actorKey === saved.actorKey,
      ).length,
      1,
    );
    assert(events.events.some((e: any) => e.action === "opened full view"));
    assert(events.events.some((e: any) => e.action === "download requested"));
    assert(!JSON.stringify(events).includes(share.token));
    assert(!JSON.stringify(events).includes("Guest-password-123"));
    const responses = await f.ok(
      `${root}/responses`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(responses.summary.respondents, 1);
    assert.equal(responses.responses[0].value, "Approved");
    assert.equal(responses.responses[0].actorEmail, "review@example.test");
    for (const endpoint of ["audit", "visitors", "responses"]) {
      assert.equal(
        (await f.req(`${root}/${endpoint}${query}`, "GET", undefined, guest))
          .status,
        403,
      );
      assert.equal(
        (await f.req(`${root}/${endpoint}`, "GET", undefined, f.member)).status,
        403,
      );
    }
    for (const role of ["viewer", "editor", "admin"]) {
      await f.ok(
        `${root}/members`,
        "PUT",
        { email: "member@example.test", role },
        f.owner,
      );
      for (const endpoint of ["audit", "visitors", "responses"])
        assert.equal(
          (await f.req(`${root}/${endpoint}`, "GET", undefined, f.member))
            .status,
          role === "admin" ? 200 : 403,
        );
    }
    const other = await f.ok(
      "/projects",
      "POST",
      { name: "Isolated project" },
      f.owner,
    );
    assert.equal(
      (await f.req(`/projects/${other.id}/audit`, "GET", undefined, f.member))
        .status,
      403,
    );
    const me = await f.ok("/me", "GET", undefined, f.owner);
    const connector = {
      id: "audit-test-connection",
      userId: me.user.id,
      projectIds: [f.project.id],
      allowWrite: true,
    };
    for (const endpoint of ["audit", "responses", "visitors"]) {
      const r = await app.fetch(
        new Request(`http://localhost:5173/api${root}/${endpoint}`),
        { platform: f.platform, connector },
      );
      assert.equal(r.status, 403);
    }
    await f.ok(`/shares/${share.id}`, "DELETE", undefined, f.owner);
    const preserved = await f.ok(
      `${root}/responses`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(preserved.responses[0].actorEmail, "review@example.test");
    assert.equal(preserved.responses[0].shareLabel, "Review");
    const visitors = await f.ok(
      `${root}/visitors?search=review%40example.test`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(visitors.visitors[0].actorName, "Review Guest");
    assert.equal(visitors.visitors[0].ipAddress, "192.0.2.25");
    const at = Date.now();
    await f.platform.db.insert(auditEvents).values(
      Array.from({ length: 60 }, (_, i) => ({
        id: crypto.randomUUID(),
        projectId: f.project.id,
        actorKey: "user:pagination",
        actorKind: "member",
        actorName: "Pagination test",
        action: "test page",
        detail: String(i),
        createdAt: at,
      })),
    );
    const first = await f.ok(
      `${root}/audit?action=test+page`,
      "GET",
      undefined,
      f.owner,
    );
    const second = await f.ok(
      `${root}/audit?action=test+page&cursor=${encodeURIComponent(first.nextCursor)}`,
      "GET",
      undefined,
      f.owner,
    );
    assert.equal(first.events.length, 50);
    assert.equal(second.events.length, 10);
    assert.equal(
      new Set([...first.events, ...second.events].map((e) => e.id)).size,
      60,
    );
    assert.equal(
      (
        await f.req(
          `${root}/audit?cursor=not-base64`,
          "GET",
          undefined,
          f.owner,
        )
      ).status,
      400,
    );
    const noLeaks = await f.ok(root, "GET", undefined, f.member);
    assert(!JSON.stringify(noLeaks).includes("192.0.2.25"));
    assert.equal(
      (
        await f.platform.db
          .select()
          .from(auditEvents)
          .where(eq(auditEvents.projectId, other.id))
          .all()
      ).length,
      1,
    );
  } finally {
    await f.cleanup();
  }
});

test("IP metadata comes from the platform and does not trust arbitrary forwarding headers", () => {
  const request = new Request("https://example.test", {
    headers: {
      "X-Forwarded-For": "198.51.100.4",
      "CF-Connecting-IP": "203.0.113.9",
      "CF-IPCountry": "US",
      "User-Agent": "Browser",
    },
  });
  assert.equal(requestInfo(request, "127.0.0.1").ipAddress, "127.0.0.1");
  assert.equal(requestInfo(request).ipAddress, null);
  assert.equal(cloudflareRequestInfo(request).ipAddress, "203.0.113.9");
  assert.equal(cloudflareRequestInfo(request).country, null);
  Object.defineProperty(request, "cf", { value: { country: "IN" } });
  assert.equal(cloudflareRequestInfo(request).country, "IN");
  assert.equal(requestInfo(request, "not-an-ip").ipAddress, null);
  request.headers.set("CF-Connecting-IPv6", "2001:db8::1");
  assert.equal(cloudflareRequestInfo(request).ipAddress, "203.0.113.9");
  request.headers.set("CF-Connecting-IP", "240.0.0.5");
  assert.equal(cloudflareRequestInfo(request).ipAddress, "2001:db8::1");
  request.headers.set("CF-Connecting-IP", "2a06:98c0:3600::103");
  assert.equal(cloudflareRequestInfo(request).ipAddress, null);
});
