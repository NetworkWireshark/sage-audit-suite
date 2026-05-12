import { BarChart3, Building2, Database, FileSearch, FolderSync } from "lucide-react";

const items = [
  { icon: BarChart3, label: "Dashboard" },
  { icon: FileSearch, label: "Comparisons" },
  { icon: FolderSync, label: "Scan folders" },
  { icon: Database, label: "Data sources" },
  { icon: Building2, label: "Companies" },
];

export default function Sidebar({ session }) {
  return (
    <aside className="border-r border-line bg-panel px-4 py-5">
      <div className="border-b border-line pb-5">
        <p className="text-xs uppercase tracking-normal text-slate-400">Sage Audit Suite</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Control center</h2>
      </div>
      <nav className="mt-6 space-y-2">
        {items.map(({ icon: Icon, label }, index) => (
          <button
            key={label}
            className={`flex w-full items-center gap-3 rounded border px-3 py-3 text-left text-sm transition ${
              index === 0 ? "border-aqua bg-aqua/10 text-white" : "border-transparent text-slate-300 hover:border-line hover:bg-panelSoft"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-8 rounded border border-line bg-panelSoft p-4">
        <p className="text-xs uppercase tracking-normal text-slate-400">Signed in</p>
        <p className="mt-2 break-all text-sm font-medium text-white">{session.email}</p>
      </div>
    </aside>
  );
}
