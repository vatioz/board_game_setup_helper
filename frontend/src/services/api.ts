/** Thin API client for the FastAPI backend. */

import type {
  AppStatus,
  ExtractResponse,
  SaveSessionRequest,
  SessionData,
  SessionSummary,
} from "../types";

const BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getAppStatus(): Promise<AppStatus> {
  const res = await fetch(`${BASE}/status`);
  return handleResponse<AppStatus>(res);
}

// ── Extract ─────────────────────────────────────────────────────────────────

export async function extractSteps(
  files: File[],
  labels: string[]
): Promise<ExtractResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("labels", labels.join(","));
  const res = await fetch(`${BASE}/extract`, { method: "POST", body: form });
  return handleResponse<ExtractResponse>(res);
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${BASE}/sessions`);
  return handleResponse<SessionSummary[]>(res);
}

export async function getSession(id: string): Promise<SessionData> {
  const res = await fetch(`${BASE}/sessions/${id}`);
  return handleResponse<SessionData>(res);
}

export async function createSession(
  data: SaveSessionRequest
): Promise<SessionData> {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SessionData>(res);
}

export async function updateSession(
  id: string,
  data: SaveSessionRequest
): Promise<SessionData> {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SessionData>(res);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
}
