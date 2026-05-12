const severityClasses = {
  high: "border-rose-400/40 bg-rose-400/10 text-rose-100",
  medium: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  low: "border-sky-400/40 bg-sky-400/10 text-sky-100",
};

export default function ErrorTable({ issues }) {
  return (
    <div className="overflow-hidden rounded border border-line bg-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-panelSoft text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Article</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Sage</th>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {issues.length ? (
              issues.map((issue) => (
                <tr key={issue.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold uppercase tracking-normal ${severityClasses[issue.severity]}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{issue.category}</td>
                  <td className="px-4 py-3 text-white">{issue.article_code || "-"}</td>
                  <td className="max-w-[240px] px-4 py-3 text-slate-300">{issue.description || "-"}</td>
                  <td className="px-4 py-3 text-slate-200">{issue.sage_value || "-"}</td>
                  <td className="px-4 py-3 text-slate-200">{issue.document_value || "-"}</td>
                  <td className="max-w-[320px] px-4 py-3 text-slate-300">{issue.message}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                  No comparison issues to display yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
