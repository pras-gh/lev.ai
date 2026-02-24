import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

type PlanStatus = "trial" | "active" | "overdue" | "cancelled";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      isPaid: boolean;
      planStatus: PlanStatus;
    };
  }

  interface User {
    id: string;
    isPaid: boolean;
    planStatus: PlanStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    isPaid?: boolean;
    planStatus?: PlanStatus;
  }
}
