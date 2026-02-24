const categories = [
  { name: "Revenue", type: "income", mapped: 1240, lastUsed: "2026-02-18" },
  { name: "Tax", type: "expense", mapped: 145, lastUsed: "2026-02-15" },
  { name: "Payroll", type: "expense", mapped: 61, lastUsed: "2026-02-14" },
  { name: "Fixed Cost", type: "expense", mapped: 90, lastUsed: "2026-02-17" },
  { name: "Marketing", type: "expense", mapped: 238, lastUsed: "2026-02-17" }
];

export default function CategoriesPage() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Coverage</p>
          <p className="mt-1 text-2xl font-semibold">81.6%</p>
          <p className="mt-1 text-xs text-emerald-600">Auto-tag above target</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Uncategorized</p>
          <p className="mt-1 text-2xl font-semibold">37</p>
          <p className="mt-1 text-xs text-amber-600">Needs review</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Active Categories</p>
          <p className="mt-1 text-2xl font-semibold">24</p>
          <p className="mt-1 text-xs text-slate-500">Income + expense buckets</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Category List</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Mapped Txns</th>
                <th className="py-2 pr-0 font-medium">Last Used</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.name} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-700">{category.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{category.type}</td>
                  <td className="py-2 pr-4 text-slate-600">{category.mapped}</td>
                  <td className="py-2 pr-0 text-slate-600">{category.lastUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
