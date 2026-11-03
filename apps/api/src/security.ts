import { hashPassword, verifyPassword } from "better-auth/crypto";
import { HTTPException } from "hono/http-exception";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./platform";
import { rateLimits } from "@sendfold/database/schema";
export const id = () => crypto.randomUUID();
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function equalSecret(a: string, b: string) {
  const aa = await digest(a),
    bb = await digest(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++)
    diff |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return diff === 0;
}
export { hashPassword, verifyPassword };
export function cleanPath(value: string) {
  const path = value.replace(/\\/g, "/");
  if (
    !path ||
    path.length > 500 ||
    path.startsWith("/") ||
    path
      .split("/")
      .some((p) => !p || p === "." || p === ".." || /[\x00-\x1f]/.test(p))
  )
    throw new HTTPException(400, { message: "Invalid file path." });
  return path;
}
export class RateLimitError extends HTTPException {
  constructor(public retryAfter: number) {
    const minutes = Math.ceil(retryAfter / 60);
    super(429, {
      message: `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
    });
  }
}

export async function throttle(
  db: Database,
  key: string,
  max = 12,
  windowMs = 15 * 60_000,
) {
  const now = Date.now();
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: now + windowMs })
    .onConflictDoUpdate({
      target: rateLimits.key,
      setWhere: sql`${rateLimits.resetAt} <= ${now} OR ${rateLimits.count} < ${max}`,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN 1 ELSE ${rateLimits.count}+1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN ${now + windowMs} ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning();
  if (row) return { key: row.key, resetAt: row.resetAt };
  const blocked = await db
    .select({ resetAt: rateLimits.resetAt })
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .get();
  throw new RateLimitError(
    Math.max(1, Math.ceil(((blocked?.resetAt ?? now + windowMs) - now) / 1000)),
  );
}

// Refund only this successful verification, never another request's failures.
export async function releaseAttempt(
  db: Database,
  attempt: { key: string; resetAt: number },
) {
  await db
    .update(rateLimits)
    .set({ count: sql`MAX(0, ${rateLimits.count} - 1)` })
    .where(
      and(
        eq(rateLimits.key, attempt.key),
        eq(rateLimits.resetAt, attempt.resetAt),
      ),
    );
}
