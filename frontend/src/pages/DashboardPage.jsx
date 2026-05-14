import { useEffect, useMemo, useState } from "react";
import { Download, LogOut, Search, ShieldCheck } from "lucide-react";
import AuditTable from "../components/AuditTable";
import { downloadReport, runComparison, uploadComparisonFiles } from "../lib/api";
import { loadActiveCompanyKey, loadCompanies, normalizeCompanyKey, saveActiveCompanyKey, saveCompanies } from "../lib/companies";
import ErrorTable from "../components/ErrorTable";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import UploadPanel from "../components/UploadPanel";
import CompaniesPage from "./CompaniesPage";

const emptyDashboard = {
  comparison_id: null,
  matched_count: 0,
  error_count: 0,
  missing_products: 0,
  complete_audit_total: 0,
  matched_with_differences: 0,
  extra_document_lines: 0,
  invoice_total: 0,
  sage_total: 0,
  difference_total: 0,
  issues: [],
  audit_lines: [],
};

const auditFilters = [
  { value: "all", label: "All lines" },
  { value: "matched", label: "Matched" },
  { value: "matched_with_differences", label: "Differences" },
  { value: "missing_in_document", label: "Missing" },
  { value: "extra_in_document", label: "Extra" },
];

export default function DashboardPage({ session, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [companies, setCompanies] = useState(loadCompanies);
  const [activeCompanyKey, setActiveCompanyKey] = useState(loadActiveCompanyKey);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [auditStatus, setAuditStatus] = useState("all");
  const [status, setStatus] = useState("Ready for upload.");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState("");

  const filteredIssues = useMemo(() => {
    return dashboard.issues.filter((issue) => {
      const searchable = `${issue.category} ${issue.article_code || ""} ${issue.description || ""} ${issue.message}`.toLowerCase();
      const matchesQuery = searchable.includes(query.toLowerCase());
      const matchesSeverity = severity === "all" || issue.severity === severity;
      return matchesQuery && matchesSeverity;
    });
  }, [dashboard.issues, query, severity]);

  const filteredAuditLines = useMemo(() => {
    return dashboard.audit_lines.filter((line) => auditStatus === "all" || line.status === auditStatus);
  }, [auditStatus, dashboard.audit_lines]);

  const pageTitle = activePage === "companies" ? "Companies" : "Document comparison dashboard";

  useEffect(() => {
    saveCompanies(companies);
  }, [companies]);

  useEffect(() => {
    saveActiveCompanyKey(activeCompanyKey);
  }, [activeCompanyKey]);

  function handleSaveCompany(company) {
    const normalizedCompany = {
      ...company,
      key: normalizeCompanyKey(company.key),
      name: company.name.trim() || normalizeCompanyKey(company.key),
    };

    setCompanies((current) => {
      const nextCompanies = current.filter((item) => item.key !== normalizedCompany.key);
      nextCompanies.push(normalizedCompany);
      return nextCompanies.sort((first, second) => {
        if (first.key === "default") {
          return -1;
        }
        if (second.key === "default") {
          return 1;
        }
        return first.name.localeCompare(second.name);
      });
    });
    setActiveCompanyKey(normalizedCompany.key);
  }

  function handleRemoveCompany(companyKey) {
    if (companyKey === "default") {
      return;
    }

    setCompanies((current) => current.filter((company) => company.key !== companyKey));
    if (activeCompanyKey === companyKey) {
      setActiveCompanyKey("default");
    }
  }

  async function handleUpload(payload) {
    setBusy(true);
    setStatus("Uploading files...");
    try {
      const upload = await uploadComparisonFiles(payload);
      setStatus("Running comparison...");
      const comparison = await runComparison(upload.upload_batch_id);
      setDashboard(comparison);
      setStatus(`Comparison ${comparison.comparison_id} complete.`);
    } catch (error) {
      setStatus(error?.response?.data?.detail || "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport(kind) {
    if (!dashboard.comparison_id) {
      return;
    }
    setExporting(kind);
    setStatus(`Preparing ${kind === "excel" ? "Excel" : "PDF"} report...`);
    try {
      await downloadReport(kind, dashboard.comparison_id);
      setStatus(`${kind === "excel" ? "Excel" : "PDF"} report downloaded.`);
    } catch (error) {
      setStatus(error?.response?.data?.detail || "Report export failed.");
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <Sidebar session={session} activePage={activePage} onPageChange={setActivePage} />
        <main className="space-y-6 px-4 py-5 md:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm text-slate-400">
                <ShieldCheck className="h-4 w-4 text-aqua" />
                Role: {session.role}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{pageTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {activePage === "dashboard" && dashboard.comparison_id ? (
                <>
                  <button type="button" onClick={() => handleExport("excel")} disabled={Boolean(exporting)} className="inline-flex items-center gap-2 rounded border border-line bg-panel px-4 py-3 text-sm font-medium text-white hover:border-aqua disabled:cursor-not-allowed disabled:opacity-60">
                    <Download className="h-4 w-4" />
                    {exporting === "excel" ? "Exporting..." : "Excel"}
                  </button>
                  <button type="button" onClick={() => handleExport("pdf")} disabled={Boolean(exporting)} className="inline-flex items-center gap-2 rounded border border-line bg-panel px-4 py-3 text-sm font-medium text-white hover:border-aqua disabled:cursor-not-allowed disabled:opacity-60">
                    <Download className="h-4 w-4" />
                    {exporting === "pdf" ? "Exporting..." : "PDF"}
                  </button>
                </>
              ) : null}
              <button onClick={onLogout} className="inline-flex items-center gap-2 rounded border border-line bg-panel px-4 py-3 text-sm font-medium text-white hover:border-coral">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>

          {activePage === "companies" ? (
            <CompaniesPage
              companies={companies}
              activeCompanyKey={activeCompanyKey}
              onSaveCompany={handleSaveCompany}
              onRemoveCompany={handleRemoveCompany}
              onSetActiveCompany={setActiveCompanyKey}
            />
          ) : (
            <>
              <UploadPanel
                onSubmit={handleUpload}
                busy={busy}
                status={status}
                companies={companies}
                companyKey={activeCompanyKey}
                onCompanyKeyChange={setActiveCompanyKey}
              />

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <StatCard label="Matched" value={dashboard.matched_count} tone="aqua" />
                <StatCard label="Errors" value={dashboard.error_count} tone="coral" />
                <StatCard label="Missing" value={dashboard.missing_products} tone="amber" />
                <StatCard label="Audit Lines" value={dashboard.complete_audit_total} tone="slate" />
                <StatCard label="Differences" value={dashboard.matched_with_differences} tone="amber" />
                <StatCard label="Extra Lines" value={dashboard.extra_document_lines} tone="slate" />
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <StatCard label="Total invoice amount" value={dashboard.invoice_total.toFixed(2)} tone="slate" />
                <StatCard label="Total Sage amount" value={dashboard.sage_total.toFixed(2)} tone="slate" />
                <StatCard label="Difference amount" value={dashboard.difference_total.toFixed(2)} tone="aqua" />
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Detected issues</h2>
                    <p className="text-sm text-slate-400">Search across article codes, descriptions, categories, and messages.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="flex min-w-[240px] items-center gap-2 rounded border border-line bg-panel px-3 py-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues" className="w-full bg-transparent text-sm text-white outline-none" />
                    </label>
                    <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="rounded border border-line bg-panel px-3 py-2 text-sm text-white outline-none">
                      <option value="all">All severities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <ErrorTable issues={filteredIssues} />
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Complete audit trail</h2>
                    <p className="text-sm text-slate-400">Review every Sage and document line used in the comparison.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {auditFilters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setAuditStatus(filter.value)}
                        className={`rounded border px-3 py-2 text-sm font-medium transition ${
                          auditStatus === filter.value
                            ? "border-aqua bg-aqua text-slate-950"
                            : "border-line bg-panel text-slate-200 hover:border-aqua"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                <AuditTable lines={filteredAuditLines} />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
