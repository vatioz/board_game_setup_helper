import type { SaveSessionRequest, SessionData, SessionSummary } from "../types";

const STORAGE_KEY = "bghelper.localSessions.v1";

function readSessions(): SessionData[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: SessionData[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listLocalSessions(): Promise<SessionSummary[]> {
  return readSessions().map(({ id, name }) => ({ id, name }));
}

export async function getLocalSession(id: string): Promise<SessionData> {
  const session = readSessions().find((entry) => entry.id === id);
  if (!session) {
    throw new Error("Session not found.");
  }
  return session;
}

export async function createLocalSession(data: SaveSessionRequest): Promise<SessionData> {
  const created: SessionData = {
    id: makeId(),
    ...data,
  };
  const sessions = readSessions().filter((entry) => entry.id !== created.id);
  writeSessions([created, ...sessions]);
  return created;
}

export async function updateLocalSession(
  id: string,
  data: SaveSessionRequest
): Promise<SessionData> {
  const updated: SessionData = {
    id,
    ...data,
  };
  const sessions = readSessions().filter((entry) => entry.id !== id);
  writeSessions([updated, ...sessions]);
  return updated;
}

export async function deleteLocalSession(id: string): Promise<void> {
  writeSessions(readSessions().filter((entry) => entry.id !== id));
}
