import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { projects } from "./schema";

export const projectItems = sqliteTable(
  "project_items",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").$type<"link" | "task">().notNull(),
    title: text("title").notNull(),
    url: text("url"),
    note: text("note").notNull().default(""),
    important: integer("important", { mode: "boolean" })
      .notNull()
      .default(false),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
    author: text("author").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("items_project").on(t.projectId, t.createdAt)],
);
