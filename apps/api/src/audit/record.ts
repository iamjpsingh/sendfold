import { getCookie, setCookie } from "hono/cookie";
import { auditEvents } from "@sendfold/database/schema";
import type { AuditActor } from "@sendfold/shared/audit";
import type { C } from "../context";
import { digest, id, randomToken } from "../security";

export async function anonymousActor(
  c: C,
  share: { id: string; label: string },
): Promise<AuditActor> {
  const cookieName = `sf_visit_${share.id}`;
  let visit = getCookie(c, cookieName);
  if (!visit || !/^[a-f0-9]{64}$/.test(visit)) {
    visit = randomToken();
    setCookie(c, cookieName, visit, {
      httpOnly: true,
      secure: c.env.platform.production,
      sameSite: "Strict",
      path: "/api",
      maxAge: 8 * 3600,
    });
  }
  return {
    actorKey: `anonymous:${await digest(visit)}`,
    actorKind: "anonymous",
    actorName: "Anonymous visitor",
    actorEmail: null,
    shareId: share.id,
    shareLabel: share.label,
  };
}
export async function audit(
  c: C,
  projectId: string,
  action: string,
  detail: string,
  options: {
    actor?: AuditActor;
    resourceId?: string;
    groupForMs?: number;
    groupBy?: string;
  } = {},
) {
  const actor = options.actor ?? c.get("auditActor");
  if (!actor) return;
  const createdAt = Date.now();
  const dedupeKey = options.groupForMs
    ? await digest(
        [
          projectId,
          options.groupBy ?? actor.actorKey,
          action,
          options.resourceId ?? "",
          Math.floor(createdAt / options.groupForMs),
        ].join(":"),
      )
    : null;
  await c.env.platform.db
    .insert(auditEvents)
    .values({
      id: id(),
      projectId,
      ...actor,
      action,
      detail: detail.slice(0, 2000),
      resourceId: options.resourceId ?? null,
      ipAddress: c.env.platform.requestInfo?.ipAddress ?? null,
      country: c.env.platform.requestInfo?.country ?? null,
      userAgent: c.env.platform.requestInfo?.userAgent ?? null,
      createdAt,
      dedupeKey,
    })
    .onConflictDoNothing();
}
