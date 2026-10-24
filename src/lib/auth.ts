import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        if (!user) {
          throw new Error("User not found");
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid password");
        }
        const isMainAdmin = user.email === process.env.ADMIN_EMAIL;
        const hasAdminRole = user.role === "admin" || user.role === "superadmin";
        const isAdmin = isMainAdmin || hasAdminRole;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: isMainAdmin ? "superadmin" : user.role || "user",
          isAdmin,
          isMainAdmin,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isAdmin = (user as any).isAdmin;
        token.isMainAdmin = (user as any).isMainAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
        (session.user as any).isMainAdmin = token.isMainAdmin as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};
