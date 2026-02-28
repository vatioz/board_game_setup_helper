import { useState } from "react";

interface Props {
  rawExtraction: string;
  rawLlmAll: string;
  rawLlmKey: string;
}

export default function DiagnosticsPanel({
  rawExtraction,
  rawLlmAll,
  rawLlmKey,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!rawExtraction && !rawLlmAll && !rawLlmKey) return null;

  return (
    <details className="diagnostics" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>🔍 Diagnostics</summary>
      <div className="diagnostics-content">
        <details>
          <summary>Raw PDF extraction ({rawExtraction.length} chars)</summary>
          <pre>{rawExtraction}</pre>
        </details>
        <details>
          <summary>LLM response – All Steps</summary>
          <pre>{rawLlmAll}</pre>
        </details>
        <details>
          <summary>LLM response – Key Steps</summary>
          <pre>{rawLlmKey}</pre>
        </details>
      </div>
    </details>
  );
}
