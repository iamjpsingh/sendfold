import { useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import type { ProjectDetail } from "@sendfold/shared/types";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/common";
import { Input } from "@/components/ui/input";
import { UploadDialog } from "./upload-dialog";
import { FilePreview } from "./file-preview";
import { useEditorState } from "./editor-state";
export function ProjectFiles({
  data,
  token,
  refresh,
}: {
  data: ProjectDetail;
  token?: string;
  refresh: () => void;
}) {
  const { project, access, files } = data;
  const { editing } = useEditorState();
  const [selected, setSelected] = useState<string>(),
    [search, setSearch] = useState("");
  const file = files.find((f) => f.id === selected) ?? files[0];
  const visible = files.filter((f) =>
    f.path.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      {!files.length ? (
        <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border border-dashed">
          <FolderOpen className="size-10 text-muted-foreground" />
          <div className="text-center">
            <h2 className="font-medium">Make room for good work</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Add a proposal, a spreadsheet, or an entire website folder to
              start the conversation.
            </p>
          </div>
          {access.allowUpload && project.status === "active" && (
            <UploadDialog
              projectId={project.id}
              token={token}
              onChange={refresh}
            />
          )}
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="rounded-lg border bg-background p-3">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Find a file…"
                aria-label="Find a file"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-auto xl:max-h-[65vh]">
              {!visible.length && (
                <p className="px-2 py-4 text-xs text-muted-foreground">
                  No files match your search.
                </p>
              )}
              {visible.map((f) => (
                <button
                  key={f.id}
                  title={f.path}
                  disabled={editing && f.id !== file?.id}
                  onClick={() => setSelected(f.id)}
                  className={cn(
                    "focus-visible:outline-2 focus-visible:outline-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left hover:bg-muted",
                    file?.id === f.id && "bg-accent",
                  )}
                >
                  <span className="w-4 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {files.findIndex((item) => item.id === f.id) + 1}.
                  </span>
                  <FileIcon name={f.name} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{f.name}</p>
                    {f.path !== f.name && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {f.path.slice(0, -f.name.length - 1)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>
          {file && (
            <FilePreview
              key={file.id}
              file={file}
              detail={data}
              token={token}
              onChange={refresh}
            />
          )}
        </div>
      )}
    </>
  );
}
