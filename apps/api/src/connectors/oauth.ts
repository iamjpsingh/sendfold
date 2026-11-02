import { mcp } from "@better-auth/mcp";
import { jwt } from "better-auth/plugins";
import { and, eq, isNull, gt, desc } from "drizzle-orm";
import { connections } from "@sendfold/database/schema";
import type { Platform } from "../platform";

export const connectorScopes = [
  "sendfold:read",
  "sendfold:write",
  "offline_access",
];
export function oauthPlugins(p: Platform) {
  return [
    jwt({ jwt: { issuer: `${p.origin}/api/auth` } }),
    mcp({
      resource: `${p.origin}/api/mcp`,
      loginPage: "/connect",
      consentPage: "/connect",
      scopes: connectorScopes,
      grantTypes: ["authorization_code", "refresh_token"],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
      accessTokenExpiresIn: 900,
      refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      refreshTokenReuseInterval: 0,
      clientPrivileges: () => false,
      extensions: [
        {
          claims: {
            accessToken: async ({ user, client }) => {
              if (!user) throw new Error("A user grant is required.");
              const grant = await p.db
                .select()
                .from(connections)
                .where(
                  and(
                    eq(connections.userId, user.id),
                    eq(connections.clientId, client.clientId),
                    isNull(connections.revokedAt),
                    gt(connections.expiresAt, Date.now()),
                  ),
                )
                .orderBy(desc(connections.createdAt))
                .get();
              if (!grant)
                throw new Error("Approve project access in Sendfold first.");
              return { sendfold_connection: grant.id };
            },
          },
        },
      ],
    }),
  ];
}
