import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
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

type DashboardAccessRow = {
  full_name: string | null;
  is_paid: boolean | null;
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

function resolveSupabaseAuthConfig() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
  } catch {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

async function authorizeWithSupabaseAuth(email: string, password: string) {
  const config = resolveSupabaseAuthConfig();
  if (!config) {
    return null;
  }

  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user?.id) {
      return null;
    }

    const fallbackName =
      typeof data.user.user_metadata?.full_name === "string" &&
      data.user.user_metadata.full_name.trim()
        ? data.user.user_metadata.full_name.trim()
        : "Trail User";

    let paidAccess: DashboardAccessRow | null = null;
    if (hasSupabaseAdminEnv()) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        const { data: accessRow } = await supabaseAdmin
          .from("dashboard_users")
          .select("full_name,is_paid")
          .eq("email", email)
          .limit(1)
          .maybeSingle<DashboardAccessRow>();
        paidAccess = accessRow ?? null;
      } catch {
        paidAccess = null;
      }
    }

    return {
      id: data.user.id,
      email: data.user.email ?? email,
      name: paidAccess?.full_name?.trim() || fallbackName,
      isPaid: Boolean(paidAccess?.is_paid),
    };
  } catch {
    return null;
  }
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

        const authUser = await authorizeWithSupabaseAuth(email, password);
        if (authUser) {
          return authUser;
        }

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
