import Link from "next/link";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default function AccessDeniedPage() {
  const bookDemoUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[960px] px-6 py-24 sm:px-8">
      <section className="glass-panel rounded-[26px] border border-white/12 p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Access Denied</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">Your account is not active yet</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Only users with an active plan can access the product dashboard. Book a demo to request early access.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={bookDemoUrl} className="lev-button lev-button--hero-dark">
            Book demo for early access
          </a>
          <Link href="/" className="lev-button lev-button--outline">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
