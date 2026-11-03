import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Question } from "@sendfold/shared/types";
import { post } from "@/lib/api";
import { Busy, ErrorBox } from "@/components/common";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ResponseInput, responseTypes } from "./response-input";
export function AddQuestion({
  projectId,
  onChange,
  number,
}: {
  projectId: string;
  onChange: () => void;
  number: number;
}) {
  const [open, setOpen] = useState(false),
    [type, setType] = useState<Question["type"]>("approval"),
    [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]),
    [preview, setPreview] = useState<string | string[]>(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const choices = type === "single" || type === "multiple";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const values = choices ? options.map((v) => v.trim()) : [];
    if (
      values.some((v) => !v) ||
      new Set(values.map((v) => v.toLowerCase())).size !== values.length
    ) {
      setError(new Error("Add at least two different, non-empty choices."));
      return;
    }
    setBusy(true);
    try {
      await post(`/projects/${projectId}/questions`, {
        prompt,
        type,
        options: values,
      });
      setOpen(false);
      setPrompt("");
      setOptions(["", ""]);
      setPreview("");
      onChange();
      toast.success(`Question ${number} added.`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add question {number}</DialogTitle>
          <DialogDescription>
            Ask one clear question, then choose how people should answer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="question-prompt">Question</Label>
              <Textarea
                id="question-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Can we proceed with this proposal?"
                required
                maxLength={2000}
              />
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {prompt.length}/2,000
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-type">Response type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as Question["type"]);
                  setPreview(v === "multiple" ? [] : "");
                }}
              >
                <SelectTrigger id="response-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(responseTypes).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {type === "approval"
                  ? "Approve, request changes or decline."
                  : type === "text"
                    ? "An open space for written feedback."
                    : choices && type === "single"
                      ? "Recipients choose exactly one option."
                      : "Recipients can select several options or select all."}
              </p>
            </div>
            {choices && (
              <div className="space-y-2">
                <Label>Answer choices</Label>
                {options.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 text-xs tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    <Input
                      aria-label={`Choice ${i + 1}`}
                      value={v}
                      maxLength={200}
                      required
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) =>
                        setOptions((values) =>
                          values.map((value, n) =>
                            n === i ? e.target.value : value,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={options.length <= 2}
                      aria-label={`Remove choice ${i + 1}`}
                      onClick={() =>
                        setOptions((values) => values.filter((_, n) => n !== i))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={options.length >= 30}
                  onClick={() => setOptions((v) => [...v, ""])}
                >
                  <Plus className="size-4" />
                  Add choice
                </Button>
              </div>
            )}
          </fieldset>
          <details className="rounded-lg border bg-muted/20 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Preview response
            </summary>
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium">
                {number}. {prompt || "Your question"}
              </p>
              <ResponseInput
                question={{
                  id: "question-preview",
                  prompt,
                  type,
                  options: options.map((v, i) => v || `Option ${i + 1}`),
                }}
                value={preview}
                onChange={setPreview}
              />
            </div>
          </details>
          {error && <ErrorBox error={error} />}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={busy || !prompt.trim()}>
              <Busy busy={busy}>Add question {number}</Busy>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
