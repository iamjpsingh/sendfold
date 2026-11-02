import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./schema";

export const connections = sqliteTable(
  "connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    clientId: text("client_id"),
    tokenHash: text("token_hash").unique(),
    projectIds: text("project_ids", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    allowWrite: integer("allow_write", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    revokedAt: integer("revoked_at"),
    lastUsedAt: integer("last_used_at"),
  },
  (t) => [index("connection_user").on(t.userId, t.clientId)],
);

export type Connection = typeof connections.$inferSelect;
