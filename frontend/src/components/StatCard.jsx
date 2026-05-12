const toneClasses = {
  aqua: "border-aqua/40 text-aqua",
  coral: "border-coral/40 text-rose-200",
  amber: "border-amber/40 text-amber-200",
  slate: "border-line text-slate-100",
};

export default function StatCard({ label, value, tone }) {
  return (
    <article className={`rounded border bg-panel p-4 ${toneClasses[tone]}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
    </article>
  );
}
