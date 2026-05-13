import axios from "axios";

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  return "/api";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sage-audit-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const { data } = await api.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  localStorage.setItem("sage-audit-token", data.access_token);
  localStorage.setItem("sage-audit-user", JSON.stringify({ email: data.email, role: data.role }));
  return data;
}

export function logout() {
  localStorage.removeItem("sage-audit-token");
  localStorage.removeItem("sage-audit-user");
}

export function currentUser() {
  const stored = localStorage.getItem("sage-audit-user");
  return stored ? JSON.parse(stored) : null;
}

export async function uploadComparisonFiles(payload) {
  const form = new FormData();
  form.append("sage_file", payload.sageFile);
  form.append("document_file", payload.documentFile);
  form.append("company_key", payload.companyKey);
  const { data } = await api.post("/upload", form);
  return data;
}

export async function runComparison(uploadBatchId) {
  const { data } = await api.post(`/compare/${uploadBatchId}`);
  return data;
}

export async function downloadReport(kind, comparisonId) {
  const extension = kind === "excel" ? "xlsx" : "pdf";
  const { data, headers } = await api.get(`/export/${kind}/${comparisonId}`, {
    responseType: "blob",
  });
  const contentDisposition = headers["content-disposition"] || "";
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || `comparison-${comparisonId}.${extension}`;
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default api;
