import { and, eq, isNotNull, isNull, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { auditEvents as events } from "@sendfold/database/schema";
import type { Platform } from "../platform";

export const identityFilters = {
  kind: z
    .enum(["member", "guest", "anonymous", "connector", "legacy"])
    .optional(),
  country: z
    .string()
    .regex(/^(?:[A-Z]{2}|unknown)$/)
    .optional(),
};
export function countryCondition(country?: string) {
  if (country === "unknown")
    return or(isNull(events.country), inArray(events.country, ["XX", "ZZ"]));
  return country ? eq(events.country, country) : undefined;
}
export async function projectCountries(db: Platform["db"], projectId: string) {
  const rows = await db
    .selectDistinct({ country: events.country })
    .from(events)
    .where(and(eq(events.projectId, projectId), isNotNull(events.country)))
    .orderBy(events.country)
    .all();
  return rows.flatMap((row) =>
    row.country && !["XX", "ZZ"].includes(row.country) ? [row.country] : [],
  );
}
