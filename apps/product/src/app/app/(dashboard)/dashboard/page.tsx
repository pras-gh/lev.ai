import { Suspense } from "react";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-2xl border border-white/10 bg-black/55 p-6 text-sm text-zinc-300">
          Loading dashboard...
        </section>
      }
    >
      <OverviewDashboard />
    </Suspense>
  );
}
