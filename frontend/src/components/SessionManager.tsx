import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Loader2, Save, Trash2 } from "lucide-react";
import type { SaveSessionRequest, SessionData, Step } from "../types";
import * as api from "../services/api";
import {
  createLocalSession,
  deleteLocalSession,
  getLocalSession,
  listLocalSessions,
  updateLocalSession,
} from "../services/localSessions";

interface Props {
  sessionId: string | null;
  sessionName: string;
  onSessionNameChange: (name: string) => void;
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;
  rawExtractions?: Record<string, string>;
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
  onSessionSaved: (id: string) => void;
  onSessionLoaded: (data: SessionData) => void;
  hasSteps: boolean;
  storageMode: "remote" | "local";
  storageReason?: string | null;
}

export default function SessionManager({
  sessionId,
  sessionName,
  onSessionNameChange,
  allSteps,
  keySteps,
  rawExtraction,
  rawExtractions,
  rawLlmAllSteps,
  rawLlmKeySteps,
  onSessionSaved,
  onSessionLoaded,
  hasSteps,
  storageMode,
  storageReason,
}: Props) {
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      const list = storageMode === "local"
        ? await listLocalSessions()
        : await api.listSessions();
      setSessions(list);
    } catch (err: unknown) {
      setSessions([]);
      setError(err instanceof Error ? err.message : "Could not load sessions.");
    }
  }, [storageMode]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const makePayload = (): SaveSessionRequest => ({
    name: sessionName.trim(),
    allSteps,
    keySteps,
    rawExtraction,
    rawExtractions,
    rawLlmAllSteps,
    rawLlmKeySteps,
  });

  const handleSave = async () => {
    if (!sessionName.trim()) {
      setError("Enter a name before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = makePayload();
      const saved = storageMode === "local"
        ? sessionId
          ? await updateLocalSession(sessionId, payload)
          : await createLocalSession(payload)
        : sessionId
          ? await api.updateSession(sessionId, payload)
          : await api.createSession(payload);
      onSessionSaved(saved.id);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string) => {
    setError(null);
    try {
      const data = storageMode === "local"
        ? await getLocalSession(id)
        : await api.getSession(id);
      onSessionLoaded(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      if (storageMode === "local") {
        await deleteLocalSession(id);
      } else {
        await api.deleteSession(id);
      }
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-soft p-4">
      {storageMode === "local" && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {storageReason
            ? `${storageReason} Sessions will be saved only in this browser for now.`
            : "Sessions are being saved only in this browser for now."}
        </p>
      )}

      {hasSteps && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Game name…"
            value={sessionName}
            onChange={(e) => onSessionNameChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-soft"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {sessionId
                  ? storageMode === "local" ? "Update Local" : "Update"
                  : storageMode === "local" ? "Save Local" : "Save"}
              </>
            )}
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {sessions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors w-full"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {storageMode === "local" ? "Saved in this browser" : "Saved sessions"} ({sessions.length})
          </button>
          {isExpanded && (
            <ul className="mt-2 space-y-1 animate-slide-in">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-1.5 group">
                  <span className="flex-1 text-sm text-slate-700 truncate">{s.name}</span>
                  <button
                    className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-all duration-150"
                    title="Load"
                    onClick={() => handleLoad(s.id)}
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-150"
                    title="Delete"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
