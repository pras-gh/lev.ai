import { Suspense } from "react";
import { ReconciliationWorkbench } from "@/components/dashboard/reconciliation-workbench";

export default function ReconciliationPage() {
  return (
    <Suspense
      fallback={
        <section className="ui-surface-card p-8 text-sm text-zinc-600">Loading reconciliation workbench...</section>
      }
    >
      <ReconciliationWorkbench />
    </Suspense>
  );
}
