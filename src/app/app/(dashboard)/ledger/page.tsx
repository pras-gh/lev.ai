import { Suspense } from "react";
import { InspiredLedgerDashboard } from "@/components/dashboard/inspired-ledger-dashboard";
import { TransactionsLedger } from "@/components/dashboard/transactions-ledger";
import { RightPanel } from "@/components/ledger/drawer";

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-3xl border border-white/10 bg-black/55 p-8 text-zinc-300">
          Loading dashboard...
        </section>
      }
    >
      <section className="space-y-3">
        <InspiredLedgerDashboard />
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-3">
            <TransactionsLedger />
          </div>
          <RightPanel />
        </section>
      </section>
    </Suspense>
  );
}
