import { Suspense } from "react";
import { IntegrationsWorkspace } from "@/components/dashboard/integrations-workspace";

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-2xl border border-white/10 bg-black/55 p-6 text-sm text-zinc-300">
          Loading integrations...
        </section>
      }
    >
      <IntegrationsWorkspace />
    </Suspense>
  );
}
