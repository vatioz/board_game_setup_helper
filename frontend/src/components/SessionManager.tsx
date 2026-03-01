import { useState, useEffect, useCallback } from "react";
import type { Step, SessionData } from "../types";
import * as api from "../services/api";

interface Props {
  sessionId: string | null;
  sessionName: string;
  onSessionNameChange: (name: string) => void;
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
  onSessionSaved: (id: string) => void;
  onSessionLoaded: (data: SessionData) => void;
  hasSteps: boolean;
}

export default function SessionManager({
  sessionId,
  sessionName,
  onSessionNameChange,
  allSteps,
  keySteps,
  rawExtraction,
  rawLlmAllSteps,
  rawLlmKeySteps,
  onSessionSaved,
  onSessionLoaded,
  hasSteps,
}: Props) {
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch session list on mount
  const refreshList = useCallback(async () => {
    try {
      const list = await api.listSessions();
      setSessions(list);
    } catch {
      /* ignore – Cosmos DB may not be configured yet */
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Save
  const handleSave = async () => {
    if (!sessionName.trim()) {
      setError("Enter a name before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: sessionName.trim(),
        allSteps,
        keySteps,
        rawExtraction,
        rawLlmAllSteps,
        rawLlmKeySteps,
      };
      let saved: SessionData;
      if (sessionId) {
        saved = await api.updateSession(sessionId, payload);
      } else {
        saved = await api.createSession(payload);
      }
      onSessionSaved(saved.id);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Load
  const handleLoad = async (id: string) => {
    setError(null);
    try {
      const data = await api.getSession(id);
      onSessionLoaded(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.deleteSession(id);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="session-manager">
      {hasSteps && (
        <div className="session-save">
          <input
            type="text"
            placeholder="Game name…"
            value={sessionName}
            onChange={(e) => onSessionNameChange(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : sessionId ? "Update" : "Save"}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {sessions.length > 0 && (
        <details className="session-list-details">
          <summary>Saved sessions ({sessions.length})</summary>
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id}>
                <span className="session-name">{s.name}</span>
                <button className="btn-icon" title="Load" onClick={() => handleLoad(s.id)}>
                  📂
                </button>
                <button className="btn-icon" title="Delete" onClick={() => handleDelete(s.id)}>
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
