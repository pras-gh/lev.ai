import { Suspense, type ReactNode } from "react";
import { DashboardShellLayout } from "@/components/dashboard/dashboard-shell-layout";

function DashboardLayoutFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-200">
      <div className="text-sm text-zinc-400">Preparing your workspace...</div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardShellLayout>{children}</DashboardShellLayout>
    </Suspense>
  );
}
