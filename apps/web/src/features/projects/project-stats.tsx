import { FolderOpen, Files, Link2 } from "lucide-react";
import type { Project } from "@sendfold/shared/types";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export function ProjectStats({ projects }: { projects: Project[] }) {
  const stats = [
    {
      title: "Active projects",
      value: projects.filter((p) => p.status === "active").length,
      icon: FolderOpen,
      detail: "Work in progress",
      tone: "border-violet-200/50 bg-violet-100/45 dark:border-violet-300/10 dark:bg-violet-300/10",
      iconTone:
        "bg-violet-200/55 text-violet-700 dark:bg-violet-300/15 dark:text-violet-200",
    },
    {
      title: "Files in your projects",
      value: projects.reduce((n, p) => n + (p.fileCount ?? 0), 0),
      icon: Files,
      detail: "Ready to review",
      tone: "border-emerald-200/50 bg-emerald-100/40 dark:border-emerald-300/10 dark:bg-emerald-300/8",
      iconTone:
        "bg-emerald-200/55 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200",
    },
    {
      title: "Share links",
      value: projects.reduce((n, p) => n + (p.shareCount ?? 0), 0),
      icon: Link2,
      detail: "Password protected",
      tone: "border-orange-200/50 bg-orange-100/45 dark:border-orange-300/10 dark:bg-orange-300/8",
      iconTone:
        "bg-orange-200/55 text-orange-700 dark:bg-orange-300/15 dark:text-orange-200",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map(({ title, value, icon: Icon, detail, tone, iconTone }) => (
        <Card key={title} className={cn("gap-3 shadow-none", tone)}>
          <CardHeader className="flex flex-row items-center justify-between pb-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                iconTone,
              )}
            >
              <Icon className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
