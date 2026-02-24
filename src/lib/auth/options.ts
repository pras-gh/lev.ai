import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type DashboardUserRow = {
  id: string | null;
  email: string | null;
  full_name: string | null;
  is_paid: boolean | null;
  password: string | null;
};

const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";

export function getMissingAuthEnvKeys() {
  const missing: string[] = [];

  if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    missing.push("NEXTAUTH_SECRET");
  }

  return missing;
}

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function authorizeWithEnv(email: string, password: string) {
  const envEmail = process.env.DASHBOARD_LOGIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.DASHBOARD_LOGIN_PASSWORD ?? "";
  const envName = process.env.DASHBOARD_LOGIN_NAME?.trim() || "Trail User";
  const envIsPaid = (process.env.DASHBOARD_LOGIN_IS_PAID ?? "false").toLowerCase() === "true";

  if (!envEmail || !envPassword) {
    return null;
  }

  if (!secureEquals(email, envEmail)) {
    return null;
  }

  if (!secureEquals(password, envPassword)) {
    return null;
  }

  return {
    id: `env-${email}`,
    email: envEmail,
    name: envName,
    isPaid: envIsPaid,
  };
}

async function authorizeWithSupabase(email: string, password: string) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("dashboard_users")
      .select("id,email,full_name,is_paid,password")
      .eq("email", email)
      .limit(1)
      .maybeSingle<DashboardUserRow>();

    if (error || !data || !data.email || !data.password) {
      return null;
    }

    if (!verifyPassword(password, data.password)) {
      return null;
    }

    return {
      id: data.id ?? data.email,
      email: data.email,
      name: data.full_name ?? "Trail User",
      isPaid: Boolean(data.is_paid),
    };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password;

        const dbUser = await authorizeWithSupabase(email, password);
        if (dbUser) {
          return dbUser;
        }

        return authorizeWithEnv(email, password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isPaid = user.isPaid;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.isPaid = Boolean(token.isPaid);
      }

      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
