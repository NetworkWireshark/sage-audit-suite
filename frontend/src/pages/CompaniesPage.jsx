import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import StatCard from "../components/StatCard";
import { normalizeCompanyKey } from "../lib/companies";

const emptyForm = {
  name: "",
  key: "",
  source: "Manual upload",
  status: "active",
};

const sourceOptions = ["Manual upload", "Sage export", "SQL Server", "Scan folder"];

const statusClasses = {
  active: "border-aqua/40 bg-aqua/10 text-teal-100",
  paused: "border-amber/40 bg-amber/10 text-amber-100",
};

export default function CompaniesPage({
  companies,
  activeCompanyKey,
  onSaveCompany,
  onRemoveCompany,
  onSetActiveCompany,
}) {
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");

  const activeCompany = companies.find((company) => company.key === activeCompanyKey) || {
    key: activeCompanyKey || "default",
    name: activeCompanyKey || "Default company",
  };
  const activeCompanies = companies.filter((company) => company.status === "active").length;

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return companies;
    }

    return companies.filter((company) => {
      const searchable = `${company.name} ${company.key} ${company.source} ${company.status}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [companies, query]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const key = normalizeCompanyKey(form.key || form.name);
    onSaveCompany({
      key,
      name: form.name.trim() || key,
      source: form.source,
      status: form.status,
    });
    setForm(emptyForm);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Saved companies" value={companies.length} tone="slate" />
        <StatCard label="Active companies" value={activeCompanies} tone="aqua" />
        <StatCard label="Upload company key" value={activeCompany?.key || "default"} tone="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <form onSubmit={submit} className="rounded border border-line bg-panel p-4 md:p-5">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">New company</h2>
            <p className="text-sm text-slate-400">Company keys are attached to new comparison uploads.</p>
          </div>
          <div className="space-y-4">
            <label className="block text-sm text-slate-300">
              Company name
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="mt-2 w-full rounded border border-line bg-ink px-3 py-2 text-white outline-none focus:border-aqua"
                placeholder="Company name"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Company key
              <input
                value={form.key}
                onChange={(event) => updateForm("key", event.target.value)}
                className="mt-2 w-full rounded border border-line bg-ink px-3 py-2 text-white outline-none focus:border-aqua"
                placeholder="company-key"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Source
              <select
                value={form.source}
                onChange={(event) => updateForm("source", event.target.value)}
                className="mt-2 w-full rounded border border-line bg-ink px-3 py-2 text-white outline-none focus:border-aqua"
              >
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              Status
              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
                className="mt-2 w-full rounded border border-line bg-ink px-3 py-2 text-white outline-none focus:border-aqua"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>
          </div>
          <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded bg-aqua px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300">
            <Plus className="h-4 w-4" />
            Save company
          </button>
        </form>

        <section className="rounded border border-line bg-panel">
          <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Company register</h2>
              <p className="text-sm text-slate-400">{activeCompany?.name || "Default company"} is active for uploads.</p>
            </div>
            <label className="flex min-w-[240px] items-center gap-2 rounded border border-line bg-ink px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search companies"
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-panelSoft text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length ? (
                  filteredCompanies.map((company) => (
                    <tr key={company.key} className="border-t border-line align-middle">
                      <td className="px-4 py-3 font-medium text-white">{company.name}</td>
                      <td className="px-4 py-3 text-slate-300">{company.key}</td>
                      <td className="px-4 py-3 text-slate-300">{company.source}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold uppercase tracking-normal ${statusClasses[company.status]}`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onSetActiveCompany(company.key)}
                            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-semibold transition ${
                              activeCompanyKey === company.key
                                ? "border-aqua bg-aqua text-slate-950"
                                : "border-line bg-panelSoft text-slate-100 hover:border-aqua"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {activeCompanyKey === company.key ? "Active" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveCompany(company.key)}
                            disabled={company.key === "default"}
                            className="inline-flex items-center gap-2 rounded border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-coral disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                      No companies match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
