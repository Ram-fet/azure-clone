// src/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiPost(endpoint, body, isFormData = false) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: isFormData
      ? undefined
      : { "Content-Type": "application/json" },
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}
