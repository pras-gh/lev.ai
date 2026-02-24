type InspiredPlaceholderPageProps = {
  title: string;
  subtitle: string;
};

const TILE =
  "rounded-[18px] border border-black/15 bg-[#efefec] p-4 text-[#1b1b1b] shadow-[0_8px_24px_rgba(0,0,0,0.22)]";

export function InspiredPlaceholderPage({ title, subtitle }: InspiredPlaceholderPageProps) {
  return (
    <section className="space-y-3 md:space-y-4" data-reveal="true">
      <article className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(255,122,26,0.26),transparent_46%)]" />
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Control Surface</p>
        <h2 className="relative mt-2 text-3xl font-medium tracking-tight text-zinc-100">{title}</h2>
        <p className="relative mt-2 max-w-2xl text-sm text-zinc-400">{subtitle}</p>

        <div className="relative mt-5 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          Visual system aligned with ledger board
        </div>
      </article>

      <div className="grid gap-3 lg:grid-cols-3" data-reveal="true" data-reveal-delay="1">
        <article className={TILE}>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Queue</p>
          <p className="mt-2 text-4xl font-light tracking-tight">12</p>
          <div className="mt-3 h-1.5 rounded-full bg-zinc-300">
            <div className="h-full w-[58%] rounded-full bg-[#ff7a1a]" />
          </div>
        </article>

        <article className={TILE}>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">SLA</p>
          <p className="mt-2 text-4xl font-light tracking-tight">92%</p>
          <div className="mt-3 grid grid-cols-6 gap-1">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className={`h-7 rounded-sm border border-black/12 ${
                  index % 5 === 0 ? "bg-[#ff7a1a]/45" : "bg-zinc-300"
                }`}
              />
            ))}
          </div>
        </article>

        <article className={TILE}>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Coverage</p>
          <p className="mt-2 text-4xl font-light tracking-tight">Live</p>
          <p className="mt-2 text-xs text-zinc-600">This module uses the same monitor cards and interaction rhythm.</p>
        </article>
      </div>
    </section>
  );
}
