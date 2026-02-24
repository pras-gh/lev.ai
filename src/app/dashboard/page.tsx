import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.planStatus !== "active") {
    redirect("/billing");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1220px] px-6 py-24 sm:px-8">
      <section className="glass-panel rounded-[26px] border border-white/12 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Product dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">Welcome back to trai\</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Your access is active. We can now wire the real accounting product modules into this dashboard shell.
        </p>
      </section>
    </main>
  );
}
