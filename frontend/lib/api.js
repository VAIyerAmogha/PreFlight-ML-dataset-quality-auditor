const API_BASE = "/api";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      if (contentType.includes("application/json")) {
        const body = await response.json();
        message = body.detail || body.message || message;
      }
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new Error(message);
  }

  if (contentType.includes("application/zip") || contentType.includes("octet-stream")) {
    return response.blob();
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  return parseResponse(response);
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function uploadDataset({ file }) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData
  });
  return parseResponse(response);
}

export async function getJob(jobId) {
  return getJson(`/jobs/${jobId}`);
}

export async function getReport(jobId) {
  return getJson(`/jobs/${jobId}/report`);
}

export async function getSuggestions(jobId) {
  return getJson(`/jobs/${jobId}/suggestions`);
}

export async function runSimulation(jobId, acceptedIds, targetColumn) {
  return postJson(`/jobs/${jobId}/simulate`, {
    accepted_ids: acceptedIds,
    ...(targetColumn ? { target_column: targetColumn } : {})
  });
}

export async function exportJob(jobId, acceptedIds, targetColumn) {
  return postJson(`/jobs/${jobId}/export`, {
    accepted_ids: acceptedIds,
    ...(targetColumn ? { target_column: targetColumn } : {})
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function saveJobContext(jobId, context) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`preflight:${jobId}:context`, JSON.stringify(context));
}

export function loadJobContext(jobId) {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(`preflight:${jobId}:context`) || "{}");
  } catch {
    return {};
  }
}
