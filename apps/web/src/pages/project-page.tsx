import { useEditorState } from "@/features/files/editor-state";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Files,
  MessageSquare,
  ClipboardCheck,
  ListTodo,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";
import { useProject } from "@/lib/queries";
import { patch } from "@/lib/api";
import { Loading, ErrorBox, Status } from "@/components/common";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { UploadDialog } from "@/features/files/upload-dialog";
import { ProjectFiles } from "@/features/files/project-files";
import { useProjectTab } from "@/lib/project-tab";
import { ProjectMembers } from "@/features/people/project-members";
import { ShareDialog } from "@/features/sharing/share-dialog";
import { Comments } from "@/features/feedback/comments";
import { ProjectItems } from "@/features/project-items/project-items";
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
    query = useQueryClient();
  const [tab, setTab] = useProjectTab(projectId, token);
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
    { project, access, files } = data;
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
              files={files}
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
      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto">
            <TabsTrigger value="files">
              <Files className="size-4" />
              Files{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                {files.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="questions" disabled={editing}>
              <ClipboardCheck className="size-4" />
              Questions{" "}
              <span className="text-xs text-muted-foreground">
                {data.questions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="feedback" disabled={editing}>
              <MessageSquare className="size-4" />
              Feedback{" "}
              <span className="text-xs text-muted-foreground">
                {data.comments.filter((c) => !c.fileId).length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="items" disabled={editing}>
              <ListTodo className="size-4" />
              Links & tasks{" "}
              <span className="text-xs text-muted-foreground">
                {data.items?.length ?? 0}
              </span>
            </TabsTrigger>
          </TabsList>
          {access.manage && (
            <Select value={project.status} onValueChange={status}>
              <SelectTrigger
                className="w-36"
                disabled={editing}
                aria-label="Project status"
              >
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
          <ProjectFiles data={data} token={token} refresh={refresh} />
        </TabsContent>
        <TabsContent value="items">
          <ProjectItems detail={data} token={token} onChange={refresh} />
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
