const logs = [
  {
    at: "2026-02-19 10:42",
    actor: "system",
    action: "transaction.autotag_v0",
    entity: "Transaction#9201"
  },
  {
    at: "2026-02-19 09:18",
    actor: "user",
    action: "transaction.patch",
    entity: "Transaction#9187"
  },
  {
    at: "2026-02-19 08:52",
    actor: "job",
    action: "integration.sync.triggered",
    entity: "Integration#razorpay"
  },
  {
    at: "2026-02-18 23:05",
    actor: "system",
    action: "transaction.csv_import",
    entity: "Batch#20260218"
  }
];

export default function AuditLogsPage() {
  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Audit Trail</h2>
        <p className="mt-1 text-xs text-slate-500">
          Immutable activity feed for transaction and workflow operations.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-0 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={`${log.at}-${log.action}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">{log.at}</td>
                  <td className="py-2 pr-4 text-slate-600">{log.actor}</td>
                  <td className="py-2 pr-4 text-slate-600">{log.action}</td>
                  <td className="py-2 pr-0 text-slate-600">{log.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
