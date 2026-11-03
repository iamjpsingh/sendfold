import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { projects } from "./schema";

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    actorKind: text("actor_kind").notNull(),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email"),
    shareId: text("share_id"),
    shareLabel: text("share_label"),
    action: text("action").notNull(),
    detail: text("detail").notNull(),
    resourceId: text("resource_id"),
    ipAddress: text("ip_address"),
    country: text("country"),
    userAgent: text("user_agent"),
    dedupeKey: text("dedupe_key"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("audit_project_time").on(t.projectId, t.createdAt, t.id),
    index("audit_actor_time").on(t.projectId, t.actorKey, t.createdAt),
    uniqueIndex("audit_dedupe").on(t.dedupeKey),
  ],
);
