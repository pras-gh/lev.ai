const monthlyReports = [
  { month: "Jan 2026", revenue: "₹12.4L", expense: "₹8.1L", net: "₹4.3L", readiness: "92%" },
  { month: "Dec 2025", revenue: "₹11.8L", expense: "₹7.9L", net: "₹3.9L", readiness: "88%" },
  { month: "Nov 2025", revenue: "₹10.9L", expense: "₹7.2L", net: "₹3.7L", readiness: "90%" }
];

export default function ReportsPage() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Cash Runway</p>
          <p className="mt-1 text-2xl font-semibold">4.8 months</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">GST Due 7d</p>
          <p className="mt-1 text-2xl font-semibold">₹1,28,400</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Recon Match</p>
          <p className="mt-1 text-2xl font-semibold">86.2%</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Compliance Confidence</p>
          <p className="mt-1 text-2xl font-semibold">89.4%</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Monthly Reports</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 font-medium">Month</th>
                <th className="py-2 pr-4 font-medium">Revenue</th>
                <th className="py-2 pr-4 font-medium">Expense</th>
                <th className="py-2 pr-4 font-medium">Net</th>
                <th className="py-2 pr-0 font-medium">Close Readiness</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReports.map((report) => (
                <tr key={report.month} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-700">{report.month}</td>
                  <td className="py-2 pr-4 text-slate-600">{report.revenue}</td>
                  <td className="py-2 pr-4 text-slate-600">{report.expense}</td>
                  <td className="py-2 pr-4 text-slate-600">{report.net}</td>
                  <td className="py-2 pr-0 text-slate-600">{report.readiness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
