import { ClipboardCheck, Download } from "lucide-react";
import type { ProjectDetail } from "@sendfold/shared/types";
import { downloadBlob } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AddQuestion } from "./add-question";
import { QuestionCard } from "./question-card";
export function Questions({
  detail,
  token,
  onChange,
}: {
  detail: ProjectDetail;
  token?: string;
  onChange: () => void;
}) {
  function exportResponses() {
    const cell = (v: string) =>
      `"${(/^[=+@\-\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
    const rows = [
      ["Question", "Respondent", "Answer"],
      ...detail.questions.flatMap((q) =>
        detail.answers
          .filter((a) => a.questionId === q.id)
          .map((a) => [
            q.prompt,
            a.author,
            Array.isArray(a.value) ? a.value.join("; ") : a.value,
          ]),
      ),
    ];
    downloadBlob(
      new Blob([rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      "responses.csv",
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Questions & decisions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear answers keep the project moving.
          </p>
        </div>
        <div className="flex gap-2">
          {detail.access.manage && detail.answers.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportResponses}>
              <Download className="size-4" />
              Export responses
            </Button>
          )}
          {detail.access.manage && detail.project.status === "active" && (
            <AddQuestion projectId={detail.project.id} onChange={onChange} />
          )}
        </div>
      </div>
      {!detail.questions.length && (
        <div className="rounded-lg border border-dashed py-14 text-center">
          <ClipboardCheck className="mx-auto mb-4 size-7 text-muted-foreground" />
          <p className="text-sm">No questions yet.</p>
        </div>
      )}
      {detail.questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          answers={detail.answers.filter((a) => a.questionId === q.id)}
          actorKey={detail.access.actorKey}
          canAnswer={
            detail.access.permission !== "view" &&
            detail.project.status === "active"
          }
          manage={detail.access.manage}
          token={token}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
