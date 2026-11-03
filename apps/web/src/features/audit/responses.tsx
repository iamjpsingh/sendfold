import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, MessageSquareText } from "lucide-react";
import type { ProjectDetail } from "@sendfold/shared/types";
import type { ResponsesPage } from "@sendfold/shared/audit";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loading, ErrorBox } from "@/components/common";
import { ActorBadge, Timestamp, Stat, exportCsv } from "./common";

export function Responses({ detail }: { detail: ProjectDetail }) {
  const [search, setSearch] = useState(""),
    [question, setQuestion] = useState("all"),
    [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ search, offset: String(offset) });
  if (question !== "all") params.set("question", question);
  const result = useQuery({
    queryKey: ["responses", detail.project.id, search, question, offset],
    queryFn: () =>
      api<ResponsesPage>(`/projects/${detail.project.id}/responses?${params}`),
    refetchInterval: 20_000,
  });
  const data = result.data;
  function exportPage() {
    if (!data) return;
    exportCsv("responses-page.csv", [
      [
        "Question number",
        "Question",
        "Respondent",
        "Type",
        "Email",
        "Share link",
        "Answer",
        "Saved at",
      ],
      ...data.responses.map((r) => {
        const index = detail.questions.findIndex((q) => q.id === r.questionId);
        return [
          String(index + 1),
          detail.questions[index]?.prompt ?? "",
          r.author,
          r.actorKind,
          r.actorEmail ?? "",
          r.shareLabel ?? "",
          Array.isArray(r.value) ? r.value.join("; ") : r.value,
          new Date(r.updatedAt).toISOString(),
        ];
      }),
    ]);
  }
  return (
    <section className="space-y-5" aria-label="Responses from everyone">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Responses from everyone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every saved answer, with the person and time. Visible only to
            project administrators.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void result.refetch()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!data?.responses.length}
            onClick={exportPage}
          >
            <Download className="size-4" />
            Export this page
          </Button>
        </div>
      </div>
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Respondents" value={data.summary.respondents} />
          <Stat label="Saved answers" value={data.summary.responses} />
          <Stat
            label="Questions answered"
            value={data.summary.answeredQuestions}
          />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Search responses"
          placeholder="Search people, questions or answers…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          maxLength={120}
        />
        <Select
          value={question}
          onValueChange={(v) => {
            setQuestion(v);
            setOffset(0);
          }}
        >
          <SelectTrigger aria-label="Filter by question" className="sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All questions</SelectItem>
            {detail.questions.map((q, i) => (
              <SelectItem key={q.id} value={q.id}>
                {i + 1}. {q.prompt.slice(0, 70)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {result.isPending ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox error={result.error} />
      ) : (
        <>
          {!data?.responses.length && (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <MessageSquareText className="mx-auto mb-3 size-6 text-muted-foreground" />
              <p>No saved responses match this view.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Recipients must select Save response. Answers inside an uploaded
                HTML file are separate from Sendfold questions.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {data?.responses.map((r) => {
              const index = detail.questions.findIndex(
                (q) => q.id === r.questionId,
              );
              return (
                <article
                  key={r.id}
                  className="space-y-3 rounded-lg border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.author}</span>
                        <ActorBadge kind={r.actorKind} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.actorEmail || "Email not provided"}
                        {r.shareLabel ? ` · ${r.shareLabel}` : ""}
                      </p>
                    </div>
                    <Timestamp value={r.updatedAt} />
                  </div>
                  <h3 className="text-sm font-medium">
                    {index + 1}. {detail.questions[index]?.prompt}
                  </h3>
                  <div className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm">
                    {Array.isArray(r.value)
                      ? r.value.join(", ") || "No choices selected"
                      : r.value || "Empty answer"}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{data?.total ?? 0} matching responses</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={offset + 50 >= (data?.total ?? 0)}
                onClick={() => setOffset(offset + 50)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Guest names and email addresses are entered by the guest and are not
        verified. Signing in again as a guest creates a separate respondent.
      </p>
    </section>
  );
}
