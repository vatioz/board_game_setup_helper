import { List } from "lucide-react";
import type { Step } from "../types";
import StepItem from "./StepItem";

interface Props {
  title: string;
  steps: Step[];
  keyStepIds: Set<string>;
  onEdit: (id: string, newText: string) => void;
  onToggleKey: (step: Step) => void;
}

export default function StepsList({
  title,
  steps,
  keyStepIds,
  onEdit,
  onToggleKey,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-soft p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-5 h-5 text-slate-600" />
        <h2 className="text-lg font-semibold text-slate-800">
          {title} <span className="text-slate-500 font-normal">({steps.length})</span>
        </h2>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto flex-1">
        {steps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            isKey={keyStepIds.has(step.id)}
            onEdit={onEdit}
            onToggleKey={onToggleKey}
          />
        ))}
      </div>
    </div>
  );
}
