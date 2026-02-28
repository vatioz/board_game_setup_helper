/** Thin API client for the FastAPI backend. */

import type {
  ExtractResponse,
  SessionSummary,
  SessionData,
  SaveSessionRequest,
} from "../types";

const BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Extract ─────────────────────────────────────────────────────────────────

export async function extractSteps(file: File): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("file", file);
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
