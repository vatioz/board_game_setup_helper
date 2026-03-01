import { useState } from "react";
import { Edit2, Star } from "lucide-react";
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
    <li 
      className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer ${
        isKey 
          ? "bg-gradient-to-r from-amber-100 via-orange-50 to-yellow-50 border-l-4 border-amber-500 shadow-md hover:shadow-lg hover:scale-[1.02] ring-1 ring-amber-200" 
          : "bg-white hover:bg-slate-50 shadow-sm hover:shadow-md hover:scale-[1.01] border border-slate-200 hover:border-slate-300"
      }`}
    >
      {editing ? (
        <input
          className="flex-1 px-2 py-1 border-2 border-primary-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
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
        <span 
          className={`flex-1 text-sm leading-relaxed cursor-pointer ${
            isKey ? "text-slate-800 font-medium" : "text-slate-700"
          }`}
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          {step.text}
        </span>
      )}
      <div className="flex gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-all duration-150"
          title="Edit"
          onClick={() => setEditing(true)}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          className={`p-1.5 rounded transition-all duration-150 ${
            isKey 
              ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" 
              : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
          }`}
          title={isKey ? "Remove from Key Steps" : "Add to Key Steps"}
          onClick={() => onToggleKey(step)}
        >
          <Star className={`w-4 h-4 ${isKey ? "fill-amber-500" : ""}`} />
        </button>
      </div>
    </li>
  );
}
