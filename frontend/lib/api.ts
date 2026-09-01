const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const fetcher = async (url: string) => {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    const error = new Error("API request failed");
    throw error;
  }
  return res.json();
};

export const adminFetcher = async (url: string, adminToken = "dev-admin-secret-2026") => {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    headers: {
      "X-Admin-Token": adminToken,
    },
  });
  if (!res.ok) {
    const error = new Error("Admin API request failed");
    throw error;
  }
  return res.json();
};

export const postData = async (url: string, data: Record<string, unknown>, adminToken?: string) => {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (adminToken) {
    headers["X-Admin-Token"] = adminToken;
  }
  const res = await fetch(fullUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
};
