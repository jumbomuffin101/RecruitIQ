import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { isTestAuthEnabled, isTestAuthUserKey, TEST_AUTH_USER_EMAILS } from "@/lib/test-auth";

const testAuthEnabled = isTestAuthEnabled();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(getPrisma()),
  providers: testAuthEnabled
    ? [
        Credentials({
          id: "recruitiq-test",
          name: "RecruitIQ test account",
          credentials: { testUserKey: { label: "Test user", type: "text" } },
          async authorize(credentials) {
            const key = credentials?.testUserKey;
            if (!isTestAuthEnabled() || !isTestAuthUserKey(key)) {
              logger.warn("test_auth_denied", { reason: "invalid_or_disabled" });
              return null;
            }
            const user = await getPrisma().user.findUnique({ where: { email: TEST_AUTH_USER_EMAILS[key] } });
            if (!user) {
              logger.warn("test_auth_denied", { reason: "fixture_missing" });
              return null;
            }
            return { id: user.id, name: user.name, email: user.email, image: user.image };
          },
        }),
      ]
    : [GitHub],
  session: { strategy: testAuthEnabled ? "jwt" : "database" },
  // The credentials fixture provider only runs against the local Playwright host.
  trustHost: testAuthEnabled ? true : undefined,
  callbacks: {
    session({ session, user, token }) {
      const userId = user?.id ?? token?.sub;
      if (session.user && userId) {
        session.user.id = userId;
      }
      return session;
    },
  },
  pages: { signIn: "/sign-in" },
});
