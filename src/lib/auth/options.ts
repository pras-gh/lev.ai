import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type PlanStatus = "trial" | "active" | "overdue" | "cancelled";
type AuthUser = {
  id: string;
  email: string;
  name: string;
  planStatus: PlanStatus;
  isPaid: boolean;
};

const PLAN_STATUSES = new Set<PlanStatus>(["trial", "active", "overdue", "cancelled"]);
const TEST_LOGIN_EMAIL = "user@gmail.com";
const TEST_LOGIN_PASSWORD = "1234";

type DashboardUserRow = {
  id: string | null;
  email: string | null;
  full_name: string | null;
  is_paid: boolean | null;
  password: string | null;
};

type AllowedUserRow = {
  full_name: string | null;
  plan_status: string | null;
};

type AllowedUserLegacyRow = {
  full_name: string | null;
  status: string | null;
};

type DashboardAccessRow = {
  full_name: string | null;
  is_paid: boolean | null;
};

const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";
const hasGoogleProviderEnv = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const isProductionDeployment =
  process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";
const authCookieDomain = (process.env.NEXTAUTH_COOKIE_DOMAIN ?? "").trim() ||
  (isProductionDeployment ? ".usetrailai.com" : undefined);
const sessionCookieName = `${isProductionDeployment ? "__Secure-" : ""}next-auth.session-token`;

export function getMissingAuthEnvKeys() {
  // A safe fallback secret is always provided via `nextAuthSecret`.
  // This keeps auth endpoints from hard-failing when envs differ across domains.
  return [];
}

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizePlanStatus(value: unknown, fallback: PlanStatus = "trial"): PlanStatus {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase() as PlanStatus;
  return PLAN_STATUSES.has(normalized) ? normalized : fallback;
}

function authorizeWithEnv(email: string, password: string): AuthUser | null {
  if (secureEquals(email, TEST_LOGIN_EMAIL) && secureEquals(password, TEST_LOGIN_PASSWORD)) {
    return {
      id: "test-user-access",
      email: TEST_LOGIN_EMAIL,
      name: "Test User",
      planStatus: "active",
      isPaid: true,
    };
  }

  const envEmail = process.env.DASHBOARD_LOGIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.DASHBOARD_LOGIN_PASSWORD ?? "";
  const envName = process.env.DASHBOARD_LOGIN_NAME?.trim() || "Trail User";
  const envIsPaid = (process.env.DASHBOARD_LOGIN_IS_PAID ?? "false").toLowerCase() === "true";
  const envPlanStatus = normalizePlanStatus(
    process.env.DASHBOARD_LOGIN_PLAN_STATUS,
    envIsPaid ? "active" : "trial"
  );

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
    planStatus: envPlanStatus,
    isPaid: envPlanStatus === "active",
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

async function resolveAllowedAccess(
  email: string,
  fallbackName: string,
  fallbackPlanStatus: PlanStatus = "trial"
): Promise<{ name: string; planStatus: PlanStatus }> {
  if (!hasSupabaseAdminEnv()) {
    return {
      name: fallbackName,
      planStatus: fallbackPlanStatus,
    };
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: allowedRow, error: allowedError } = await supabaseAdmin
      .from("allowed_users")
      .select("full_name,plan_status")
      .eq("email", email)
      .limit(1)
      .maybeSingle<AllowedUserRow>();

    if (!allowedError && allowedRow) {
      return {
        name: allowedRow.full_name?.trim() || fallbackName,
        planStatus: normalizePlanStatus(allowedRow.plan_status, fallbackPlanStatus),
      };
    }

    if (allowedError) {
      const allowedLegacyResult = await supabaseAdmin
        .from("allowed_users")
        .select("full_name,status")
        .eq("email", email)
        .limit(1)
        .maybeSingle<AllowedUserLegacyRow>();

      if (!allowedLegacyResult.error && allowedLegacyResult.data) {
        return {
          name: allowedLegacyResult.data.full_name?.trim() || fallbackName,
          planStatus: normalizePlanStatus(allowedLegacyResult.data.status, fallbackPlanStatus),
        };
      }
    }

    const { data: dashboardAccessRow, error: dashboardAccessError } = await supabaseAdmin
      .from("dashboard_users")
      .select("full_name,is_paid")
      .eq("email", email)
      .limit(1)
      .maybeSingle<DashboardAccessRow>();

    if (!dashboardAccessError && dashboardAccessRow) {
      return {
        name: dashboardAccessRow.full_name?.trim() || fallbackName,
        planStatus: dashboardAccessRow.is_paid ? "active" : "trial",
      };
    }
  } catch {
    // fall through
  }

  return {
    name: fallbackName,
    planStatus: fallbackPlanStatus,
  };
}

async function authorizeWithSupabaseAuth(email: string, password: string): Promise<AuthUser | null> {
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

    const allowedAccess = await resolveAllowedAccess(email, fallbackName, "trial");

    return {
      id: data.user.id,
      email: data.user.email ?? email,
      name: allowedAccess.name,
      planStatus: allowedAccess.planStatus,
      isPaid: allowedAccess.planStatus === "active",
    };
  } catch {
    return null;
  }
}

async function authorizeWithSupabase(email: string, password: string): Promise<AuthUser | null> {
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

    const defaultPlanStatus: PlanStatus = data.is_paid ? "active" : "trial";
    const allowedAccess = await resolveAllowedAccess(
      email,
      data.full_name ?? "Trail User",
      defaultPlanStatus
    );

    return {
      id: data.id ?? data.email,
      email: data.email,
      name: allowedAccess.name,
      planStatus: allowedAccess.planStatus,
      isPaid: allowedAccess.planStatus === "active",
    };
  } catch {
    return null;
  }
}

const credentialsProvider = CredentialsProvider({
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
});

const providers: NonNullable<NextAuthOptions["providers"]> = [credentialsProvider];

if (hasGoogleProviderEnv) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  useSecureCookies: isProductionDeployment,
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProductionDeployment,
        ...(authCookieDomain ? { domain: authCookieDomain } : {}),
      },
    },
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
      if (!email) {
        return "/private-access";
      }

      const allowed = await resolveAllowedAccess(email, user.name ?? "Trail User", "trial");
      if (allowed.planStatus !== "active") {
        return "/private-access";
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const email =
          typeof user.email === "string" && user.email.trim()
            ? user.email.trim().toLowerCase()
            : typeof token.email === "string"
              ? token.email.trim().toLowerCase()
              : "";

        const fallbackPlanStatus = normalizePlanStatus(
          (user as { planStatus?: unknown }).planStatus,
          (user as { isPaid?: boolean }).isPaid ? "active" : "trial"
        );

        let resolvedName =
          typeof user.name === "string" && user.name.trim() ? user.name.trim() : "Trail User";
        let resolvedPlanStatus = fallbackPlanStatus;

        if (email && account?.provider === "google") {
          const allowed = await resolveAllowedAccess(email, resolvedName, "trial");
          resolvedName = allowed.name;
          resolvedPlanStatus = allowed.planStatus;
        }

        token.id = String((user as { id?: string }).id ?? token.id ?? token.sub ?? email);
        token.email = email || token.email;
        token.name = resolvedName;
        token.planStatus = resolvedPlanStatus;
        token.isPaid = resolvedPlanStatus === "active";
      } else {
        token.planStatus = normalizePlanStatus(token.planStatus, token.isPaid ? "active" : "trial");
        token.isPaid = token.planStatus === "active";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.planStatus = normalizePlanStatus(
          token.planStatus,
          token.isPaid ? "active" : "trial"
        );
        session.user.isPaid = session.user.planStatus === "active";
      }

      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
