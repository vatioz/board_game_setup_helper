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
    <div className="steps-column">
      <h2>{title} ({steps.length})</h2>
      <ul className="steps-list">
        {steps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            isKey={keyStepIds.has(step.id)}
            onEdit={onEdit}
            onToggleKey={onToggleKey}
          />
        ))}
      </ul>
    </div>
  );
}
