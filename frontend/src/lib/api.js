import axios from "axios";

export const AUTH_STORAGE_KEYS = {
  token: "sage-audit-token",
  user: "sage-audit-user",
};

export const AUTH_EXPIRED_EVENT = "sage-audit-auth-expired";

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
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  const isLoginRequest = config.url?.includes("/auth/login");
  if (token && !isLoginRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem(AUTH_STORAGE_KEYS.token)) {
      logout();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const { data } = await api.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  localStorage.setItem(AUTH_STORAGE_KEYS.token, data.access_token);
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify({ email: data.email, role: data.role }));
  return data;
}

export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

export function currentUser() {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  const stored = localStorage.getItem(AUTH_STORAGE_KEYS.user);
  if (!token || !stored) {
    logout();
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    logout();
    return null;
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify({ email: data.email, role: data.role }));
  return data;
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
