import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@sendfold/database/schema";
import type { Platform } from "./platform";
import { oauthPlugins } from "./connectors/oauth";
export function createAuth(platform: Platform) {
  return betterAuth({
    appName: "Sendfold",
    baseURL: platform.origin,
    secret: platform.secret,
    plugins: oauthPlugins(platform),
    database: drizzleAdapter(platform.db, { provider: "sqlite", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "member", input: false },
        workspaceId: { type: "string", required: false, input: false },
        disabled: { type: "boolean", defaultValue: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: { useSecureCookies: platform.production },
    trustedOrigins: [platform.origin],
    rateLimit: { enabled: false }, // The API applies persistent, deployment-independent throttling.
  });
}
