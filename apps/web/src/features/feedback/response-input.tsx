import type { Question } from "@sendfold/shared/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
export const responseTypes = {
  approval: "Approval",
  text: "Written response",
  single: "Choose one",
  multiple: "Choose multiple",
};
export function ResponseInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: Pick<Question, "id" | "prompt" | "type" | "options">;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}) {
  if (question.type === "text")
    return (
      <Textarea
        aria-label={question.prompt || "Written response"}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={4000}
        placeholder="Your answer…"
      />
    );
  const options =
    question.type === "approval"
      ? ["Approved", "Changes requested", "Rejected"]
      : question.options;
  if (question.type !== "multiple")
    return (
      <RadioGroup
        aria-label={question.prompt || "Choose one"}
        value={String(value)}
        onValueChange={onChange}
        disabled={disabled}
      >
        {options.map((option, i) => (
          <Label
            key={i}
            htmlFor={`${question.id}-${i}`}
            className="flex items-center gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem id={`${question.id}-${i}`} value={option} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {i + 1}.
            </span>
            {option || `Option ${i + 1}`}
          </Label>
        ))}
      </RadioGroup>
    );
  const selected = Array.isArray(value) ? value : [];
  return (
    <div
      className="space-y-2"
      role="group"
      aria-label={question.prompt || "Choose multiple"}
    >
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange([...options])}
          >
            Select all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange([])}
          >
            Clear selection
          </Button>
        </div>
      )}
      {options.map((option, i) => (
        <Label
          key={i}
          htmlFor={`${question.id}-${i}`}
          className="flex items-center gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
        >
          <Checkbox
            id={`${question.id}-${i}`}
            disabled={disabled}
            checked={selected.includes(option)}
            onCheckedChange={(v) =>
              onChange(
                v
                  ? [...selected, option]
                  : selected.filter((s) => s !== option),
              )
            }
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {i + 1}.
          </span>
          {option || `Option ${i + 1}`}
        </Label>
      ))}
    </div>
  );
}
