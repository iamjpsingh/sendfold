// Schema derived from Better Auth 1.7.15 plugin definitions.
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user, session } from "./schema";
import { oauthClient } from "./oauth-clients";
export const oauthRefreshToken = sqliteTable(
  "oauth_refresh_token",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: text("resources", { mode: "json" }).$type<string[]>(),
    requestedUserInfoClaims: text("requested_user_info_claims", {
      mode: "json",
    }).$type<string[]>(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    rotatedAt: integer("rotated_at", { mode: "timestamp_ms" }),
    rotationReplayResponse: text("rotation_replay_response"),
    rotationReplayExpiresAt: integer("rotation_replay_expires_at", {
      mode: "timestamp_ms",
    }),
    authTime: integer("auth_time", { mode: "timestamp_ms" }),
    confirmation: text("confirmation", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
  },
  (t) => [
    index("oauth_refresh_token_client_id").on(t.clientId),
    index("oauth_refresh_token_session_id").on(t.sessionId),
    index("oauth_refresh_token_user_id").on(t.userId),
    index("oauth_refresh_token_authorization_code_id").on(
      t.authorizationCodeId,
    ),
  ],
);
export const oauthAccessToken = sqliteTable(
  "oauth_access_token",
  {
    id: text("id").primaryKey(),
    token: text("token").unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    authorizationCodeId: text("authorization_code_id"),
    resources: text("resources", { mode: "json" }).$type<string[]>(),
    requestedUserInfoClaims: text("requested_user_info_claims", {
      mode: "json",
    }).$type<string[]>(),
    refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
      onDelete: "cascade",
    }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    confirmation: text("confirmation", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
  },
  (t) => [
    index("oauth_access_token_client_id").on(t.clientId),
    index("oauth_access_token_session_id").on(t.sessionId),
    index("oauth_access_token_user_id").on(t.userId),
    index("oauth_access_token_authorization_code_id").on(t.authorizationCodeId),
    index("oauth_access_token_refresh_id").on(t.refreshId),
  ],
);
export const oauthConsent = sqliteTable(
  "oauth_consent",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    resources: text("resources", { mode: "json" }).$type<string[]>(),
    requestedUserInfoClaims: text("requested_user_info_claims", {
      mode: "json",
    }).$type<string[]>(),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("oauth_consent_client_id").on(t.clientId),
    index("oauth_consent_user_id").on(t.userId),
  ],
);
