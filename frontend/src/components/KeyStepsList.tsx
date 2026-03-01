import { useState } from "react";
import { Star, GripVertical, Edit2, X } from "lucide-react";
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
    <li 
      ref={setNodeRef} 
      style={style} 
      className="flex items-start gap-3 bg-gradient-to-r from-amber-100 via-orange-50 to-yellow-50 px-4 py-3 rounded-lg border-l-4 border-amber-500 shadow-md hover:shadow-lg transition-all duration-200 group ring-1 ring-amber-200 hover:ring-amber-300"
    >
      <button 
        className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-all mt-0.5 text-amber-700 hover:text-amber-900 hover:scale-110" 
        {...attributes} 
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>

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
          className="flex-1 text-sm leading-relaxed text-slate-800 font-medium cursor-pointer" 
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
          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-150" 
          title="Remove from Key Steps" 
          onClick={() => onRemove(step.id)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
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
    <div className="bg-white rounded-xl shadow-soft-lg p-5 border-2 border-amber-300 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
        <h2 className="text-lg font-semibold text-slate-800">
          Key Steps <span className="text-slate-500 font-normal">({steps.length})</span>
        </h2>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-3 overflow-y-auto flex-1">
            {steps.map((step) => (
              <SortableStep key={step.id} step={step} onEdit={onEdit} onRemove={onRemove} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
