import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Download } from "lucide-react";
import type { ProjectFile } from "@sendfold/shared/types";
import { api, shareQuery, contentUrl, date, formatBytes } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorBox } from "@/components/common";
interface Revision {
  number: number;
  author: string;
  createdAt: number;
  size: number;
}
export function VersionHistory({
  file,
  token,
  allowDownload,
}: {
  file: ProjectFile;
  token?: string;
  allowDownload: boolean;
}) {
  const [open, setOpen] = useState(false);
  const revisions = useQuery({
    queryKey: ["versions", file.id, file.version, token],
    queryFn: () =>
      api<Revision[]>(`/files/${file.id}/versions${shareQuery(token)}`),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="size-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {file.name} — earlier versions remain available.
          </DialogDescription>
        </DialogHeader>
        {revisions.error && <ErrorBox error={revisions.error} />}
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {revisions.data?.map((r) => (
            <div
              key={r.number}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  Version {r.number}
                  {r.number === 1 ? " · Original upload" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.author} · {date(r.createdAt)} · {formatBytes(r.size)}
                </p>
              </div>
              {allowDownload && (
                <Button size="icon" variant="ghost" asChild>
                  <a
                    aria-label={`Download version ${r.number}`}
                    href={`${contentUrl(file.id, token, true)}&version=${r.number}`}
                    download
                  >
                    <Download className="size-4" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
