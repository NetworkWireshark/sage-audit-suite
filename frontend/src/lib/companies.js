const COMPANIES_STORAGE_KEY = "sage-audit-companies";
const ACTIVE_COMPANY_STORAGE_KEY = "sage-audit-active-company";

export const defaultCompanies = [
  {
    key: "default",
    name: "Default company",
    source: "Manual upload",
    status: "active",
  },
];

export function normalizeCompanyKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "default";
}

export function loadCompanies() {
  const fallback = [...defaultCompanies];

  try {
    const stored = localStorage.getItem(COMPANIES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    const companies = parsed
      .map((company) => ({
        key: normalizeCompanyKey(company?.key),
        name: String(company?.name || company?.key || "Company").trim(),
        source: String(company?.source || "Manual upload").trim(),
        status: company?.status === "paused" ? "paused" : "active",
      }))
      .filter((company, index, list) => company.key && list.findIndex((item) => item.key === company.key) === index);

    if (!companies.some((company) => company.key === "default")) {
      companies.unshift(defaultCompanies[0]);
    }

    return companies.length ? companies : fallback;
  } catch {
    return fallback;
  }
}

export function saveCompanies(companies) {
  try {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  } catch {
    // The app can keep running with in-memory company state if browser storage is unavailable.
  }
}

export function loadActiveCompanyKey() {
  try {
    return normalizeCompanyKey(localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY));
  } catch {
    return "default";
  }
}

export function saveActiveCompanyKey(companyKey) {
  try {
    localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, normalizeCompanyKey(companyKey));
  } catch {
    // The selected key is still held in React state for the current session.
  }
}
