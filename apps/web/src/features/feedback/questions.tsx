import { ClipboardCheck, Download } from "lucide-react";
import type { ProjectDetail } from "@sendfold/shared/types";
import { csv } from "@/lib/csv";
import { downloadBlob } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AddQuestion } from "./add-question";
import { QuestionCard } from "./question-card";
export function Questions({
  detail,
  token,
  onChange,
  onViewResponses,
}: {
  detail: ProjectDetail;
  token?: string;
  onChange: () => void;
  onViewResponses?: () => void;
}) {
  function exportResponses() {
    const rows = [
      ["Number", "Question", "Respondent", "Answer"],
      ...detail.questions.flatMap((q, i) =>
        detail.answers
          .filter((a) => a.questionId === q.id)
          .map((a) => [
            String(i + 1),
            q.prompt,
            a.author,
            Array.isArray(a.value) ? a.value.join("; ") : a.value,
          ]),
      ),
    ];
    downloadBlob(
      new Blob([csv(rows)], {
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
        <div className="flex flex-wrap gap-2">
          {detail.access.manage && (
            <Button size="sm" onClick={onViewResponses}>
              View all responses ({detail.answers.length})
            </Button>
          )}
          {detail.access.manage && detail.answers.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportResponses}>
              <Download className="size-4" />
              Export responses
            </Button>
          )}
          {detail.access.manage && detail.project.status === "active" && (
            <AddQuestion
              projectId={detail.project.id}
              number={detail.questions.length + 1}
              onChange={onChange}
            />
          )}
        </div>
      </div>
      {!detail.questions.length && (
        <div className="rounded-lg border border-dashed py-14 text-center">
          <ClipboardCheck className="mx-auto mb-4 size-7 text-muted-foreground" />
          <p className="text-sm">No questions yet.</p>
        </div>
      )}
      {detail.questions.length > 0 && (
        <p
          className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {detail.access.manage
            ? `${detail.answers.length} saved responses from ${new Set(detail.answers.map((a) => a.actorKey)).size} respondents`
            : `${detail.questions.filter((q) => detail.answers.some((a) => a.questionId === q.id && a.actorKey === detail.access.actorKey)).length} of ${detail.questions.length} questions answered by you`}
        </p>
      )}
      {detail.questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          number={i + 1}
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
