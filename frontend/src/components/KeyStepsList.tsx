import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Step } from "../types";

// ── Sortable row ────────────────────────────────────────────────────────────

function SortableStep({
  step,
  onEdit,
  onRemove,
}: {
  step: Step;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <li ref={setNodeRef} style={style} className="key-step-item">
      <span className="drag-handle" {...attributes} {...listeners}>
        ☰
      </span>

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
        <button className="btn-icon" title="Edit" onClick={() => setEditing(true)}>
          ✏️
        </button>
        <button className="btn-icon" title="Remove from Key Steps" onClick={() => onRemove(step.id)}>
          ✕
        </button>
      </span>
    </li>
  );
}

// ── Key Steps list with drag-and-drop ───────────────────────────────────────

interface Props {
  steps: Step[];
  onReorder: (steps: Step[]) => void;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

export default function KeyStepsList({ steps, onReorder, onEdit, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const updated = [...steps];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      onReorder(updated);
    }
  };

  return (
    <div className="steps-column steps-column--key">
      <h2>⭐ Key Steps ({steps.length})</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="steps-list">
            {steps.map((step) => (
              <SortableStep key={step.id} step={step} onEdit={onEdit} onRemove={onRemove} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
