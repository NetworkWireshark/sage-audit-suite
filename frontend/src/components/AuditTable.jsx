const statusClasses = {
  matched: "border-aqua/40 bg-aqua/10 text-teal-100",
  matched_with_differences: "border-amber/40 bg-amber/10 text-amber-100",
  missing_in_document: "border-coral/40 bg-coral/10 text-rose-100",
  extra_in_document: "border-sky-400/40 bg-sky-400/10 text-sky-100",
};

function formatNumber(value) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(2);
}

function labelForStatus(status) {
  return status.replaceAll("_", " ");
}

export default function AuditTable({ lines }) {
  return (
    <div className="overflow-hidden rounded border border-line bg-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-panelSoft text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Match</th>
              <th className="px-4 py-3 font-medium">Sage line</th>
              <th className="px-4 py-3 font-medium">Document line</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Unit price</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line) => (
                <tr key={line.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold uppercase tracking-normal ${statusClasses[line.status] || "border-line bg-panelSoft text-slate-200"}`}>
                      {labelForStatus(line.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{line.match_method.replaceAll("_", " ")}</div>
                    <div className="text-xs text-slate-500">{Math.round(line.confidence)}%</div>
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-slate-200">
                    <div className="font-medium text-white">{line.sage_article_code || "-"}</div>
                    <div className="text-slate-400">{line.sage_description || "-"}</div>
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-slate-200">
                    <div className="font-medium text-white">{line.document_article_code || "-"}</div>
                    <div className="text-slate-400">{line.document_description || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatNumber(line.sage_quantity)} / {formatNumber(line.document_quantity)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatNumber(line.sage_unit_price)} / {formatNumber(line.document_unit_price)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatNumber(line.sage_total)} / {formatNumber(line.document_total)}</td>
                  <td className="max-w-[260px] px-4 py-3 text-slate-400">{line.notes || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                  No audit lines to display yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
