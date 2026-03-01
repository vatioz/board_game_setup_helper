import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, FolderOpen, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-soft p-4">
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
                {sessionId ? "Update" : "Save"}
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
            Saved sessions ({sessions.length})
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
