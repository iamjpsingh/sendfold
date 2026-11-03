import { Download, ExternalLink } from "lucide-react";
import type { ProjectDetail, ProjectFile } from "@sendfold/shared/types";
import { contentUrl, formatBytes, shareQuery } from "@/lib/api";
import { FileIcon } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Comments } from "../feedback/comments";
import { VersionHistory } from "./version-history";
import { ShareDialog } from "../sharing/share-dialog";
import { FileRenderer } from "./file-renderer";
export function FilePreview({
  file,
  detail,
  token,
  onChange,
  full = false,
}: {
  file: ProjectFile;
  detail: ProjectDetail;
  token?: string;
  onChange: () => void;
  full?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileIcon name={file.name} />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium">{file.name}</h2>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} · Version {file.version}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`/preview/${detail.project.id}/${file.id}${shareQuery(token)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open full view
                </a>
              </Button>
            }
            {detail.access.manage && (
              <ShareDialog
                projectId={detail.project.id}
                files={detail.files}
                initialFileId={file.id}
                locked={detail.project.status !== "active"}
              />
            )}
            <VersionHistory
              file={file}
              token={token}
              allowDownload={detail.access.allowDownload}
            />
            {detail.access.allowDownload && (
              <Button size="sm" variant="outline" asChild>
                <a href={contentUrl(file.id, token, true)} download={file.name}>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            )}
          </div>
        </div>
        <FileRenderer
          full={full}
          file={file}
          files={detail.files}
          token={token}
          canEdit={
            detail.access.permission === "edit" &&
            detail.project.status === "active"
          }
          onChange={onChange}
        />
      </div>
      <div className="rounded-lg border bg-background p-5">
        <h3 className="mb-5 text-sm font-semibold">File feedback</h3>
        <Comments
          detail={detail}
          fileId={file.id}
          token={token}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
