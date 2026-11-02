import { ProjectStats } from "@/features/projects/project-stats";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  FolderOpen,
  Files,
  ArrowUpRight,
  LayoutGrid,
  List,
  Clock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useProjects, useMe } from "@/lib/queries";
import { date } from "@/lib/api";
import { createSampleProject } from "@/lib/sample-project";
import {
  PageTitle,
  Status,
  Loading,
  ErrorBox,
  Busy,
} from "@/components/common";
import { ProjectDialog } from "@/components/project-dialog";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
const colors: Record<string, string> = {
  violet:
    "bg-violet-100/70 text-violet-600 dark:bg-violet-300/15 dark:text-violet-200",
  blue: "bg-sky-100/70 text-sky-700 dark:bg-sky-300/15 dark:text-sky-200",
  emerald:
    "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200",
  amber:
    "bg-amber-100/70 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200",
  rose: "bg-rose-100/70 text-rose-600 dark:bg-rose-300/15 dark:text-rose-200",
};
export function ProjectsPage() {
  const me = useMe();
  const canCreate = me.data?.user.role === "super_admin";
  const projects = useProjects(),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [view, setView] = useState("grid"),
    [sampling, setSampling] = useState(false),
    query = useQueryClient(),
    navigate = useNavigate();
  if (projects.isPending) return <Loading />;
  if (projects.error)
    return (
      <div className="p-8">
        <ErrorBox error={projects.error} />
      </div>
    );
  const all = projects.data,
    visible = all.filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        `${p.name} ${p.client}`.toLowerCase().includes(search.toLowerCase()),
    );
  async function sample() {
    setSampling(true);
    try {
      const p = await createSampleProject();
      await query.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSampling(false);
    }
  }
  return (
    <main className="mx-auto max-w-7xl space-y-8 p-5 md:p-8">
      <PageTitle
        title="Your projects"
        description="Everything you’re sharing, all in one place."
        actions={canCreate ? <ProjectDialog /> : undefined}
      />
      <ProjectStats projects={all} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All projects</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Search projects"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 pl-9"
            />
          </div>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Grid view"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            aria-label="List view"
            onClick={() => setView("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>
      {!visible.length ? (
        <Card className="items-center border-dashed py-14 text-center shadow-none">
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
            <FolderOpen className="size-6 text-muted-foreground" />
          </div>
          <CardHeader className="w-full max-w-md">
            <CardTitle>
              {all.length
                ? "No projects match your search"
                : canCreate
                  ? "Start with a project"
                  : "Your projects will appear here"}
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              {all.length
                ? "Try a different name or status."
                : canCreate
                  ? "Give your work a home. Add files, collect decisions, and share one protected link."
                  : "Ask an administrator to add you to a project."}
            </CardDescription>
          </CardHeader>
          {!all.length && canCreate && (
            <>
              <ProjectDialog />
              <Button variant="ghost" onClick={sample} disabled={sampling}>
                <Busy busy={sampling}>
                  <Sparkles className="size-4" />
                  Try a sample project
                </Busy>
              </Button>
            </>
          )}
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <Link
              key={p.id}
              to="/projects/$projectId"
              params={{ projectId: p.id }}
              className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full gap-5 shadow-none transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-4 flex justify-between">
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-lg",
                        colors[p.color],
                      )}
                    >
                      <FolderOpen className="size-5" />
                    </div>
                    <Status status={p.status} />
                  </div>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {p.name}
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription>
                    {p.client || "Team project"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {p.description ||
                      "Add files and invite someone to take a look."}
                  </p>
                </CardContent>
                <CardFooter className="justify-between border-t pt-4 text-xs text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1.5">
                      <Files className="size-3.5" />
                      {p.fileCount} files
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="size-3.5" />
                      {p.commentCount}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {date(p.updatedAt)}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{p.client || "—"}</TableCell>
                  <TableCell>
                    <Status status={p.status} />
                  </TableCell>
                  <TableCell>{p.fileCount}</TableCell>
                  <TableCell>{date(p.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {visible.length} project{visible.length !== 1 ? "s" : ""}
        </span>
        <span>Only people you give access can see your work.</span>
      </div>
    </main>
  );
}
