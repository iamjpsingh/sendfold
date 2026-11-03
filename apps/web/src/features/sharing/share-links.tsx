import { Copy } from "lucide-react";
import type { Share, ProjectFile } from "@sendfold/shared/types";
import { date } from "@/lib/api";
import { ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
export function ShareLinks({
  shares,
  files,
  error,
  onCopy,
  onRevoke,
}: {
  shares?: Share[];
  files: ProjectFile[];
  error: unknown;
  onCopy: (value: string) => void;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Existing links</h3>
      {!!error && <ErrorBox error={error} />}
      {!shares?.length && (
        <p className="text-sm text-muted-foreground">No links created yet.</p>
      )}
      {shares?.map((s, i) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {i + 1}. {s.label}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {s.fileId
                ? `${files.find((f) => f.id === s.fileId)?.name ?? "Single file"} · ${s.viewMode} view`
                : "Entire project"}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.revokedAt
                ? "Revoked"
                : s.expiresAt && s.expiresAt < Date.now()
                  ? "Expired"
                  : `${s.permission} · ${s.expiresAt ? `until ${date(s.expiresAt)}` : "no expiry"}`}
            </p>
          </div>
          {!s.revokedAt && (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Copy ${s.label} link`}
                onClick={() => onCopy(`${location.origin}/s/${s.token}`)}
              >
                <Copy className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRevoke(s.id)}>
                Revoke
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
