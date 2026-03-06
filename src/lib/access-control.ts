import { getDbPool } from "@/lib/db";

type AllowedUserPlanRow = {
  plan_status: string | null;
};

type AllowedUserLegacyRow = {
  status: string | null;
};

type DashboardUserRow = {
  is_paid: boolean | null;
};

type AccessDecision = {
  allowed: boolean;
  planStatus: string;
};

function normalizePlanStatus(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "trial";
  }

  return normalized;
}

export async function resolveAccessByEmail(email: string): Promise<AccessDecision> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      allowed: false,
      planStatus: "trial"
    };
  }

  const db = getDbPool();

  try {
    const allowedResult = await db.query<AllowedUserPlanRow>(
      `
      SELECT
        plan_status::text
      FROM allowed_users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [normalizedEmail]
    );

    const allowedRow = allowedResult.rows[0];
    if (allowedRow) {
      const planStatus = normalizePlanStatus(allowedRow.plan_status);
      return {
        allowed: planStatus === "active",
        planStatus
      };
    }
  } catch {
    try {
      const legacyResult = await db.query<AllowedUserLegacyRow>(
        `
        SELECT
          status::text
        FROM allowed_users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [normalizedEmail]
      );

      const legacyRow = legacyResult.rows[0];
      if (legacyRow) {
        const planStatus = normalizePlanStatus(legacyRow.status);
        return {
          allowed: planStatus === "active",
          planStatus
        };
      }
    } catch {
      // Continue to dashboard_users fallback.
    }
  }

  try {
    const dashboardResult = await db.query<DashboardUserRow>(
      `
      SELECT is_paid
      FROM dashboard_users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [normalizedEmail]
    );

    const dashboardRow = dashboardResult.rows[0];
    if (dashboardRow) {
      return {
        allowed: Boolean(dashboardRow.is_paid),
        planStatus: dashboardRow.is_paid ? "active" : "trial"
      };
    }
  } catch {
    // Fail closed when neither access table is available.
  }

  return {
    allowed: false,
    planStatus: "trial"
  };
}
