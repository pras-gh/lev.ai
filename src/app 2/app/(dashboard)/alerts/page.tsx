import { Suspense } from "react";
import { AlertsWorkbench } from "@/components/dashboard/alerts-workbench";

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-2xl border border-white/10 bg-black/55 p-6 text-sm text-zinc-300">
          Loading alerts...
        </section>
      }
    >
      <AlertsWorkbench />
    </Suspense>
  );
}
