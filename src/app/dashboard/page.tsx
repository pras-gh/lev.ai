import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const candidate = value.find((entry) => typeof entry === "string" && entry.length > 0);
    return candidate ?? null;
  }

  return null;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const workspaceId = firstValue(params.workspaceId);
  const businessId = firstValue(params.businessId);
  const next = new URLSearchParams();

  if (workspaceId) {
    next.set("workspaceId", workspaceId);
  }

  if (businessId) {
    next.set("businessId", businessId);
  }

  const query = next.toString();
  redirect(query ? `/app/dashboard?${query}` : "/app/dashboard");
}
