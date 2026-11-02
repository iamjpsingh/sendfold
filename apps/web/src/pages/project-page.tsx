import { useEditorState } from "@/features/files/editor-state";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Files,
  MessageSquare,
  ClipboardCheck,
  Search,
  FolderOpen,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";
import { useProject } from "@/lib/queries";
import { patch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loading, ErrorBox, Status, FileIcon } from "@/components/common";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { UploadDialog } from "@/features/files/upload-dialog";
import { FilePreview } from "@/features/files/file-preview";
import { ProjectMembers } from "@/features/people/project-members";
import { ShareDialog } from "@/features/sharing/share-dialog";
import { Comments } from "@/features/feedback/comments";
import { Questions } from "@/features/feedback/questions";
export function ProjectPage({
  projectId,
  token,
}: {
  projectId: string;
  token?: string;
}) {
  const { editing } = useEditorState();
  const detail = useProject(projectId, token),
    query = useQueryClient(),
    [selected, setSelected] = useState<string>(),
    [search, setSearch] = useState("");
  function refresh() {
    void query.invalidateQueries({ queryKey: ["project", projectId] });
    void query.invalidateQueries({ queryKey: ["projects"] });
  }
  async function status(value: string) {
    try {
      await patch(`/projects/${projectId}`, { status: value });
      refresh();
      toast.success(
        value === "active" ? "Project reopened" : `Project ${value}`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  if (detail.isPending) return <Loading />;
  if (detail.error)
    return (
      <div className="p-8">
        <ErrorBox error={detail.error} retry={() => void detail.refetch()} />
      </div>
    );
  const data = detail.data,
    { project, access, files } = data,
    file = files.find((f) => f.id === selected) ?? files[0],
    visible = files.filter((f) =>
      f.path.toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-5 md:p-8">
      {!token && (
        <Link
          to="/"
          className="flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All projects
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <Status status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.client || "Team project"}
            {project.description ? ` · ${project.description}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {access.allowUpload && project.status === "active" && (
            <UploadDialog
              projectId={project.id}
              token={token}
              onChange={refresh}
            />
          )}{" "}
          {access.manage && <ProjectMembers projectId={project.id} />}
          {access.manage && (
            <ShareDialog
              projectId={project.id}
              locked={project.status !== "active"}
            />
          )}
        </div>
      </div>
      {project.status !== "active" && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
          <LockKeyhole className="size-4" />
          This project is {project.status}. You can still review its files and
          responses.
        </div>
      )}
      <Tabs defaultValue="files" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <TabsList>
            <TabsTrigger value="files">
              <Files className="size-4" />
              Files{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                {files.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="questions" disabled={editing}>
              <ClipboardCheck className="size-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="feedback" disabled={editing}>
              <MessageSquare className="size-4" />
              Feedback
            </TabsTrigger>
          </TabsList>
          {access.manage && (
            <Select value={project.status} onValueChange={status}>
              <SelectTrigger className="w-36" disabled={editing}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <TabsContent value="files">
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
                  {visible.map((f) => (
                    <button
                      key={f.id}
                      title={f.path}
                      disabled={editing && f.id !== file?.id}
                      onClick={() => setSelected(f.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left hover:bg-muted",
                        file?.id === f.id && "bg-accent",
                      )}
                    >
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
        </TabsContent>
        <TabsContent value="questions">
          <Questions detail={data} token={token} onChange={refresh} />
        </TabsContent>
        <TabsContent value="feedback">
          <div className="mx-auto max-w-3xl rounded-xl border bg-background p-6">
            <h2 className="mb-6 font-semibold">Project conversation</h2>
            <Comments detail={data} token={token} onChange={refresh} />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
