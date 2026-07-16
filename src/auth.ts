import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(getPrisma()),
  providers: [GitHub],
  session: { strategy: "database" },
  pages: { signIn: "/sign-in" },
});
