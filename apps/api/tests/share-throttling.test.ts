import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { rateLimits } from "@sendfold/database/schema";
import { releaseFixture } from "./release-fixture";
import { fixture } from "./fixture";
import { throttle, releaseAttempt, RateLimitError } from "../src/security";

test("five failures lock a link; successes preserve failures and cooldown expires", async () => {
  const f = await releaseFixture();
  try {
    const { share, guest } = await f.share();
    const path = `/shared/${share.token}/unlock`;
    const key = `share:${share.token}`;
    const attempt = (password: string, name = "Client") =>
      f.req(path, "POST", { password, name });
    for (let i = 0; i < 4; i++)
      assert.equal((await attempt("incorrect", `Guest ${i}`)).status, 401);
    assert.equal((await attempt("Guest-password-123")).status, 200);
    assert.equal((await attempt("incorrect")).status, 401);
    const blocked = await attempt("Guest-password-123", "Different guest");
    assert.equal(blocked.status, 429);
    assert(!blocked.headers.get("set-cookie")?.includes(`sf_${share.id}=`));
    const retry = Number(blocked.headers.get("Retry-After"));
    assert(retry > 0 && retry <= 900);
    const body = (await blocked.json()) as { error: string };
    assert.match(body.error, /Try again in/);
    assert.equal(
      (await f.req(`/shared/${share.token}/session`, "GET", undefined, guest))
        .status,
      200,
    );
    const other = await f.share();
    assert(other.guest, "Another link still opens independently");
    await f.platform.db
      .update(rateLimits)
      .set({ resetAt: Date.now() - 1 })
      .where(eq(rateLimits.key, key));
    assert.equal((await attempt("Guest-password-123")).status, 200);
    const row = await f.platform.db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key))
      .get();
    assert.equal(row?.count, 0);
  } finally {
    await f.cleanup();
  }
});

test("parallel attempts cannot bypass the limit or refund a newer window", async () => {
  const f = await fixture();
  try {
    const db = f.platform.db;
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () => throttle(db, "test-budget", 5)),
    );
    const accepted = attempts.filter((r) => r.status === "fulfilled");
    assert.equal(accepted.length, 5);
    for (const result of attempts.filter((r) => r.status === "rejected")) {
      assert(result.reason instanceof RateLimitError);
      assert(result.reason.retryAfter > 0);
    }
    const old = accepted[0].value;
    await releaseAttempt(db, old);
    await throttle(db, "test-budget", 5);
    await assert.rejects(throttle(db, "test-budget", 5), RateLimitError);
    await db
      .update(rateLimits)
      .set({ resetAt: Date.now() - 1 })
      .where(eq(rateLimits.key, old.key));
    const next = await throttle(db, old.key, 5);
    assert.notEqual(next.resetAt, old.resetAt);
    await releaseAttempt(db, old);
    const row = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, old.key))
      .get();
    assert.equal(row?.count, 1);
  } finally {
    await f.cleanup();
  }
});
