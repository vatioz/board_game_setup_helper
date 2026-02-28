import { useState, useCallback } from "react";
import type { Step } from "./types";
import { extractSteps } from "./services/api";
import FileUpload from "./components/FileUpload";
import StepsList from "./components/StepsList";
import KeyStepsList from "./components/KeyStepsList";
import SessionManager from "./components/SessionManager";
import DiagnosticsPanel from "./components/DiagnosticsPanel";

export default function App() {
  // ── State ───────────────────────────────────────────────────────────────
  const [allSteps, setAllSteps] = useState<Step[]>([]);
  const [keySteps, setKeySteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // diagnostics
  const [rawExtraction, setRawExtraction] = useState("");
  const [rawLlmAll, setRawLlmAll] = useState("");
  const [rawLlmKey, setRawLlmKey] = useState("");

  // current session id (set after save / load)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");

  // ── Upload handler ────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await extractSteps(file);
      setAllSteps(result.allSteps);
      setKeySteps(result.keySteps);
      setRawExtraction(result.rawExtraction);
      setRawLlmAll(result.rawLlmAllSteps);
      setRawLlmKey(result.rawLlmKeySteps);
      setSessionId(null);
      setSessionName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step editing (propagates to both lists) ───────────────────────────
  const handleEditStep = useCallback(
    (id: string, newText: string) => {
      const update = (steps: Step[]) =>
        steps.map((s) => (s.id === id ? { ...s, text: newText } : s));
      setAllSteps(update);
      setKeySteps(update);
    },
    []
  );

  // ── Toggle key ↔ all ──────────────────────────────────────────────────
  const handleToggleKey = useCallback(
    (step: Step) => {
      const isKey = keySteps.some((s) => s.id === step.id);
      if (isKey) {
        setKeySteps((prev) => prev.filter((s) => s.id !== step.id));
      } else {
        setKeySteps((prev) => [...prev, step]);
      }
    },
    [keySteps]
  );

  // ── Print key steps ───────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const html = `
      <!DOCTYPE html>
      <html><head>
        <title>${sessionName || "Key Steps"} – Print</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 2rem auto; color: #111; }
          h1 { font-size: 1.4rem; border-bottom: 2px solid #111; padding-bottom: .3rem; }
          ol { padding-left: 1.2rem; }
          li { margin-bottom: .5rem; font-size: 1rem; }
        </style>
      </head><body>
        <h1>${sessionName || "Key Setup Steps"}</h1>
        <ol>${keySteps.map((s) => `<li>${s.text}</li>`).join("")}</ol>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  }, [keySteps, sessionName]);

  // ── Session loaded callback ───────────────────────────────────────────
  const handleSessionLoaded = useCallback(
    (data: {
      id: string;
      name: string;
      allSteps: Step[];
      keySteps: Step[];
      rawExtraction: string;
      rawLlmAllSteps: string;
      rawLlmKeySteps: string;
    }) => {
      setSessionId(data.id);
      setSessionName(data.name);
      setAllSteps(data.allSteps);
      setKeySteps(data.keySteps);
      setRawExtraction(data.rawExtraction);
      setRawLlmAll(data.rawLlmAllSteps);
      setRawLlmKey(data.rawLlmKeySteps);
    },
    []
  );

  const hasSteps = allSteps.length > 0;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎲 Board Game Setup Helper</h1>
      </header>

      <section className="upload-section">
        <FileUpload onUpload={handleUpload} loading={loading} />
        {error && <p className="error">{error}</p>}
      </section>

      {hasSteps && (
        <>
          <section className="session-section">
            <SessionManager
              sessionId={sessionId}
              sessionName={sessionName}
              onSessionNameChange={setSessionName}
              allSteps={allSteps}
              keySteps={keySteps}
              rawExtraction={rawExtraction}
              rawLlmAllSteps={rawLlmAll}
              rawLlmKeySteps={rawLlmKey}
              onSessionSaved={(id) => setSessionId(id)}
              onSessionLoaded={handleSessionLoaded}
            />
            <button className="btn btn-print" onClick={handlePrint}>
              🖨️ Print Key Steps
            </button>
          </section>

          <div className="columns">
            <StepsList
              title="All Steps"
              steps={allSteps}
              keyStepIds={new Set(keySteps.map((s) => s.id))}
              onEdit={handleEditStep}
              onToggleKey={handleToggleKey}
            />
            <KeyStepsList
              steps={keySteps}
              onReorder={setKeySteps}
              onEdit={handleEditStep}
              onRemove={(id) =>
                setKeySteps((prev) => prev.filter((s) => s.id !== id))
              }
            />
          </div>

          <DiagnosticsPanel
            rawExtraction={rawExtraction}
            rawLlmAll={rawLlmAll}
            rawLlmKey={rawLlmKey}
          />
        </>
      )}
    </div>
  );
}
