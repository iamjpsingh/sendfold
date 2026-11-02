import { hashPassword, verifyPassword } from "better-auth/crypto";
import { HTTPException } from "hono/http-exception";
import { sql } from "drizzle-orm";
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
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} < ${now} THEN 1 ELSE ${rateLimits.count}+1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} < ${now} THEN ${now + windowMs} ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning();
  if (row.count > max)
    throw new HTTPException(429, {
      message: "Too many attempts. Please try again later.",
    });
}
