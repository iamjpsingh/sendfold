import { useState } from "react";
import { toast } from "sonner";
import type { Question, Answer } from "@sendfold/shared/types";
import { api, shareQuery } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Busy } from "@/components/common";
export function QuestionCard({
  question,
  answers,
  actorKey,
  canAnswer,
  manage,
  token,
  onChange,
}: {
  question: Question;
  answers: Answer[];
  actorKey: string;
  canAnswer: boolean;
  manage: boolean;
  token?: string;
  onChange: () => void;
}) {
  const own = answers.find((a) => a.actorKey === actorKey);
  const [value, setValue] = useState<string | string[]>(
      own?.value ?? (question.type === "multiple" ? [] : ""),
    ),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api(`/questions/${question.id}/answer${shareQuery(token)}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      toast.success("Response saved");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const options =
    question.type === "approval"
      ? ["Approved", "Changes requested", "Rejected"]
      : question.options;
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex justify-between gap-3">
          <Badge variant="secondary" className="text-xs font-normal">
            {question.type === "approval"
              ? "Decision"
              : question.type === "text"
                ? "Written response"
                : question.type === "multiple"
                  ? "Choose any"
                  : "Choose one"}
          </Badge>
          {own && (
            <span className="text-xs text-muted-foreground">
              Response saved
            </span>
          )}
        </div>
        <CardTitle className="pt-2 text-base leading-6">
          {question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {question.type === "text" ? (
          <Textarea
            aria-label={question.prompt}
            value={String(value)}
            onChange={(e) => setValue(e.target.value)}
            disabled={!canAnswer}
            placeholder="Your answer…"
          />
        ) : (
          <div className="space-y-2">
            {question.type === "multiple" && canAnswer && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setValue([...options])}
                >
                  Select all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setValue([])}>
                  Clear selection
                </Button>
              </div>
            )}
            {options.map((option) => (
              <Label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal"
              >
                <Checkbox
                  disabled={!canAnswer}
                  checked={
                    Array.isArray(value)
                      ? value.includes(option)
                      : value === option
                  }
                  onCheckedChange={(checked) =>
                    setValue(
                      question.type === "multiple"
                        ? checked
                          ? [...(Array.isArray(value) ? value : []), option]
                          : (Array.isArray(value) ? value : []).filter(
                              (v) => v !== option,
                            )
                        : checked
                          ? option
                          : "",
                    )
                  }
                />
                {option}
              </Label>
            ))}
          </div>
        )}
        {canAnswer && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (!value.length && question.type !== "multiple")}
            onClick={save}
          >
            <Busy busy={busy}>{own ? "Update response" : "Save response"}</Busy>
          </Button>
        )}
        {manage && answers.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {answers.map((a) => (
              <p key={a.id} className="text-sm">
                <span className="font-medium">{a.author}: </span>
                <span className="text-muted-foreground">
                  {Array.isArray(a.value) ? a.value.join(", ") : a.value}
                </span>
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
