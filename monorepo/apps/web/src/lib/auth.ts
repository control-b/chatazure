import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "azure-ad-b2c",
      name: "Azure AD B2C",
      type: "oauth",
      wellKnown: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW}/v2.0/.well-known/openid_configuration`,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          orgId: profile.extension_OrgId || profile.org_id,
          role: profile.extension_Role || profile.role || "clerk",
          status: "active",
        };
      },
    },
    // Optional demo provider for local/dev usage
    ...((process.env.ENABLE_DEMO_AUTH ?? "true") === "true"
      ? [
          Credentials({
            id: "demo",
            name: "Demo",
            credentials: {
              name: {
                label: "Name",
                type: "text",
                placeholder: "Dispatcher Doe",
              },
            },
            async authorize(credentials, _req) {
              const name =
                (credentials?.name as string | undefined)?.trim() ||
                "Demo User";
              return {
                id: "demo-user",
                name,
                email: "demo@example.com",
                orgId: "demo-org",
                role: "dispatcher",
                status: "active",
              } as any;
            },
          }),
        ]
      : []),
  ],
  /**
   * NextAuth configuration
   * ----------------------
   * Shapes the JWT and session with trucking-specific claims:
   * - accessToken: OAuth access token for backend calls.
   * - orgId: multi-tenant org identifier (from B2C custom attribute, if present).
   * - role: RBAC role.
   * - status: required by shared User type; default to 'active'.
   */
  callbacks: {
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account?: any;
      profile?: any;
    }) {
      // Persist additional data to the token
      if (account && profile) {
        token.accessToken = account.access_token;
        token.orgId = profile.extension_OrgId || profile.org_id;
        token.role = profile.extension_Role || profile.role || "clerk";
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      session.user.orgId = token.orgId;
      session.user.role = token.role;
      session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
};
