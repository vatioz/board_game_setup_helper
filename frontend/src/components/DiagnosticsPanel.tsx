import { useState } from "react";
import { Bug, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  rawExtraction: string;
  rawExtractions?: Record<string, string>;
  rawLlmAll: string;
  rawLlmKey: string;
}

export default function DiagnosticsPanel({
  rawExtraction,
  rawExtractions,
  rawLlmAll,
  rawLlmKey,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const hasExtractions =
    rawExtractions && Object.keys(rawExtractions).length > 0;

  if (!rawExtraction && !hasExtractions && !rawLlmAll && !rawLlmKey) return null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="no-print mt-8 bg-slate-800 rounded-xl shadow-soft-lg p-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-white font-semibold hover:text-primary-300 transition-colors w-full"
      >
        <Bug className="w-5 h-5" />
        <span>Diagnostics</span>
        {open ? <ChevronDown className="w-5 h-5 ml-auto" /> : <ChevronRight className="w-5 h-5 ml-auto" />}
      </button>
      
      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {/* Per-document extraction sections (multi-PDF) */}
          {hasExtractions ? (
            Object.entries(rawExtractions!).map(([label, text]) => (
              <div key={label} className="bg-slate-700 rounded-lg p-3">
                <button
                  onClick={() => toggleSection(`ext-${label}`)}
                  className="flex items-center gap-2 text-slate-200 text-sm font-medium hover:text-white transition-colors w-full"
                >
                  {openSections[`ext-${label}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  PDF extraction – {label} ({text.length.toLocaleString()} chars)
                </button>
                {openSections[`ext-${label}`] && (
                  <pre className="mt-3 max-h-80 overflow-auto bg-slate-900 text-slate-300 p-3 rounded text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {text}
                  </pre>
                )}
              </div>
            ))
          ) : (
            /* Fallback: single rawExtraction (old sessions) */
            <div className="bg-slate-700 rounded-lg p-3">
              <button
                onClick={() => toggleSection("extraction")}
                className="flex items-center gap-2 text-slate-200 text-sm font-medium hover:text-white transition-colors w-full"
              >
                {openSections.extraction ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Raw PDF extraction ({rawExtraction.length.toLocaleString()} chars)
              </button>
              {openSections.extraction && (
                <pre className="mt-3 max-h-80 overflow-auto bg-slate-900 text-slate-300 p-3 rounded text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {rawExtraction}
                </pre>
              )}
            </div>
          )}

          <div className="bg-slate-700 rounded-lg p-3">
            <button
              onClick={() => toggleSection("allSteps")}
              className="flex items-center gap-2 text-slate-200 text-sm font-medium hover:text-white transition-colors w-full"
            >
              {openSections.allSteps ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              LLM response – All Steps
            </button>
            {openSections.allSteps && (
              <pre className="mt-3 max-h-80 overflow-auto bg-slate-900 text-slate-300 p-3 rounded text-xs leading-relaxed whitespace-pre-wrap break-words">
                {rawLlmAll}
              </pre>
            )}
          </div>

          <div className="bg-slate-700 rounded-lg p-3">
            <button
              onClick={() => toggleSection("keySteps")}
              className="flex items-center gap-2 text-slate-200 text-sm font-medium hover:text-white transition-colors w-full"
            >
              {openSections.keySteps ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              LLM response – Key Steps
            </button>
            {openSections.keySteps && (
              <pre className="mt-3 max-h-80 overflow-auto bg-slate-900 text-slate-300 p-3 rounded text-xs leading-relaxed whitespace-pre-wrap break-words">
                {rawLlmKey}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
