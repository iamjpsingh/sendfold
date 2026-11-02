import { useState } from "react";
import { Check, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import type { ProjectDetail } from "@sendfold/shared/types";
import { post, patch, shareQuery, date } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Busy } from "@/components/common";
export function Comments({
  detail,
  fileId,
  token,
  onChange,
}: {
  detail: ProjectDetail;
  fileId?: string;
  token?: string;
  onChange: () => void;
}) {
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false);
  const comments = detail.comments.filter((c) =>
      fileId ? c.fileId === fileId : !c.fileId,
    ),
    canComment =
      detail.access.permission !== "view" && detail.project.status === "active";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post(
        `/projects/${detail.project.id}/comments${shareQuery(token)}`,
        { body, fileId },
      );
      setBody("");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resolve(id: string, resolved: boolean) {
    try {
      await patch(`/comments/${id}${shareQuery(token)}`, { resolved });
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="space-y-5">
      {comments.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <MessageSquare className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Start the conversation</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fileId
              ? "Feedback stays attached to this file and version."
              : "Keep project-wide feedback together here."}
          </p>
        </div>
      )}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {c.author.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{c.author}</span>
              <span className="text-xs text-muted-foreground">
                {date(c.createdAt)}
                {c.version ? ` · v${c.version}` : ""}
              </span>
              {c.resolved && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Check className="size-3" />
                  Resolved
                </Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {c.body}
            </p>
            {canComment &&
              (detail.access.manage ||
                c.actorKey === detail.access.actorKey) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-0 text-xs text-muted-foreground"
                  onClick={() => resolve(c.id, !c.resolved)}
                >
                  {c.resolved ? "Reopen" : "Mark resolved"}
                </Button>
              )}
          </div>
        </div>
      ))}
      {canComment && (
        <form className="space-y-3 border-t pt-5" onSubmit={submit}>
          <Textarea
            aria-label="Your feedback"
            placeholder="Leave some helpful feedback…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            required
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Posting as {detail.access.name}
            </span>
            <Button size="sm" disabled={busy || !body.trim()}>
              <Busy busy={busy}>
                <Send className="size-3.5" />
                Post feedback
              </Busy>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
