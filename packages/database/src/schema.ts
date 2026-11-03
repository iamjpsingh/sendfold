import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  role: text("role").notNull().default("member"),
  workspaceId: text("workspace_id").references(() => workspaces.id),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
});
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    client: text("client").notNull().default(""),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("active"),
    color: text("color").notNull().default("violet"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("project_workspace").on(t.workspaceId)],
);
// One installation; access is assigned independently for each project.
export const projectMembers = sqliteTable(
  "project_members",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"admin" | "editor" | "viewer">().notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("project_member").on(t.projectId, t.userId),
    index("member_user").on(t.userId),
  ],
);
export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("file_project_path").on(t.projectId, t.path)],
);
export const versions = sqliteTable(
  "versions",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    objectKey: text("object_key").notNull(),
    workbookKey: text("workbook_key"),
    size: integer("size").notNull(),
    author: text("author").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("version_number").on(t.fileId, t.number)],
);
export const shares = sqliteTable(
  "shares",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    label: text("label").notNull(),
    passwordHash: text("password_hash").notNull(),
    fileId: text("file_id").references(() => files.id, { onDelete: "cascade" }),
    viewMode: text("view_mode")
      .$type<"compact" | "full">()
      .notNull()
      .default("compact"),
    permission: text("permission").notNull().default("comment"),
    allowDownload: integer("allow_download", { mode: "boolean" })
      .notNull()
      .default(true),
    allowUpload: integer("allow_upload", { mode: "boolean" })
      .notNull()
      .default(false),
    expiresAt: integer("expires_at"),
    revokedAt: integer("revoked_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("share_project").on(t.projectId)],
);
export const guests = sqliteTable(
  "guests",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    shareId: text("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("guest_share").on(t.shareId)],
);
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fileId: text("file_id").references(() => files.id, { onDelete: "cascade" }),
    version: integer("version"),
    body: text("body").notNull(),
    author: text("author").notNull(),
    actorKey: text("actor_key").notNull(),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("comment_project").on(t.projectId, t.createdAt)],
);
export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    type: text("type").notNull(),
    options: text("options", { mode: "json" }).$type<string[]>().notNull(),
    position: integer("position").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("question_project").on(t.projectId, t.position)],
);
export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    author: text("author").notNull(),
    value: text("value", { mode: "json" }).$type<string | string[]>().notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("answer_actor").on(t.questionId, t.actorKey)],
);
export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    author: text("author").notNull(),
    action: text("action").notNull(),
    detail: text("detail").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("activity_workspace").on(t.workspaceId, t.createdAt),
    index("activity_project").on(t.projectId, t.createdAt),
  ],
);
export const leases = sqliteTable("leases", {
  fileId: text("file_id")
    .primaryKey()
    .references(() => files.id, { onDelete: "cascade" }),
  actorKey: text("actor_key").notNull(),
  author: text("author").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type StoredFile = typeof files.$inferSelect;
export type AppUser = typeof user.$inferSelect;
export * from "./connectors";
export * from "./oauth-clients";
export * from "./oauth-tokens";

export * from "./project-items";

export * from "./audit";
