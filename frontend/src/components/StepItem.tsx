import { useState } from "react";
import type { Step } from "../types";

interface Props {
  step: Step;
  isKey: boolean;
  onEdit: (id: string, newText: string) => void;
  onToggleKey: (step: Step) => void;
}

export default function StepItem({ step, isKey, onEdit, onToggleKey }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.text);

  const commitEdit = () => {
    setEditing(false);
    if (draft.trim() && draft !== step.text) {
      onEdit(step.id, draft.trim());
    } else {
      setDraft(step.text);
    }
  };

  return (
    <li className={`step-item ${isKey ? "step-item--key" : ""}`}>
      {editing ? (
        <input
          className="step-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") {
              setDraft(step.text);
              setEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <span className="step-text" onDoubleClick={() => setEditing(true)}>
          {step.text}
        </span>
      )}
      <span className="step-actions">
        <button
          className="btn-icon"
          title="Edit"
          onClick={() => setEditing(true)}
        >
          ✏️
        </button>
        <button
          className="btn-icon"
          title={isKey ? "Remove from Key Steps" : "Add to Key Steps"}
          onClick={() => onToggleKey(step)}
        >
          {isKey ? "⭐" : "☆"}
        </button>
      </span>
    </li>
  );
}
