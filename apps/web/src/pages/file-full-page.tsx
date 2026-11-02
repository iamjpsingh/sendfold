import { useParams, useSearch } from "@tanstack/react-router";
import { LockKeyhole, Download } from "lucide-react";
import { useProject } from "@/lib/queries";
import { Brand, Loading, ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FileRenderer } from "@/features/files/file-renderer";
import { VersionHistory } from "@/features/files/version-history";
import { contentUrl } from "@/lib/api";
export function FileFullPage() {
  const { projectId, fileId } = useParams({ strict: false }) as {
    projectId: string;
    fileId: string;
  };
  const search = useSearch({ strict: false }) as { share?: string };
  const token = typeof search.share === "string" ? search.share : undefined;
  const project = useProject(projectId, token),
    file = project.data?.files.find((f) => f.id === fileId);
  const back = token
    ? `/s/${encodeURIComponent(token)}`
    : `/projects/${projectId}`;
  if (project.isPending) return <Loading />;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex min-h-[57px] items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Brand small />
          <span className="truncate text-sm font-medium">
            {file?.name ?? "File preview"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <LockKeyhole className="size-3" />
            Protected preview
          </span>
          {file && project.data && (
            <VersionHistory
              file={file}
              token={token}
              allowDownload={project.data.access.allowDownload}
            />
          )}
          {file && project.data?.access.allowDownload && (
            <Button size="sm" variant="outline" asChild>
              <a href={contentUrl(file.id, token, true)} download={file.name}>
                <Download className="size-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={back}>Back to project</a>
          </Button>
        </div>
      </header>
      {project.error ? (
        <div className="mx-auto max-w-xl space-y-4 p-8">
          <ErrorBox error={project.error} />
          <p className="text-sm text-muted-foreground">
            Open the project to enter its password or sign in, then return to
            this preview.
          </p>
        </div>
      ) : !file ? (
        <div className="p-8">File not found.</div>
      ) : (
        <FileRenderer
          file={file}
          files={project.data!.files}
          token={token}
          canEdit={
            project.data!.access.permission === "edit" &&
            project.data!.project.status === "active"
          }
          onChange={() => void project.refetch()}
          full
        />
      )}
    </div>
  );
}
