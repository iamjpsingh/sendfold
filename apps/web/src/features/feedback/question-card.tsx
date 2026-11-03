import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Question, Answer } from "@sendfold/shared/types";
import { api, shareQuery } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponseInput, responseTypes } from "./response-input";
import { Badge } from "@/components/ui/badge";
import { Busy } from "@/components/common";
export function QuestionCard({
  question,
  number,
  answers,
  actorKey,
  canAnswer,
  manage,
  token,
  onChange,
}: {
  question: Question;
  number: number;
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
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const savedValue = JSON.stringify(
    own?.value ?? (question.type === "multiple" ? [] : ""),
  );
  const hasDraft = useRef(false);
  useEffect(() => {
    if (!hasDraft.current) setValue(JSON.parse(savedValue));
  }, [savedValue]);
  function change(value: string | string[]) {
    setValue(value);
    setDirty(true);
    hasDraft.current = true;
  }
  async function save() {
    setBusy(true);
    try {
      await api(`/questions/${question.id}/answer${shareQuery(token)}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      toast.success("Response saved");
      setDirty(false);
      hasDraft.current = false;
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex justify-between gap-3">
          <Badge variant="secondary" className="text-xs font-normal">
            {responseTypes[question.type]}
          </Badge>
          {own && (
            <span className="text-xs text-muted-foreground">
              Response saved
            </span>
          )}
        </div>
        <CardTitle className="pt-2 text-base leading-6">
          <span className="mr-2 tabular-nums text-link">{number}.</span>
          {question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponseInput
          question={question}
          value={value}
          onChange={change}
          disabled={!canAnswer || busy}
        />
        {canAnswer && (
          <Button
            size="sm"
            disabled={
              busy ||
              (!dirty && !!own) ||
              (!value.length && question.type !== "multiple")
            }
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
