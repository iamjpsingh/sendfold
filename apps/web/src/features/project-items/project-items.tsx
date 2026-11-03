import { useState } from "react";
import { ArrowUpRight, Star, ListTodo, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { ProjectDetail, ProjectItem } from "@sendfold/shared/types";
import { patch, shareQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemFilters } from "./item-filters";
import { Progress } from "@/components/ui/progress";
import { ItemDialog } from "./item-dialog";
export function ProjectItems({
  detail,
  token,
  onChange,
}: {
  detail: ProjectDetail;
  token?: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null),
    [filter, setFilter] = useState("all"),
    [hideCompleted, setHideCompleted] = useState(false);
  const canEdit =
    detail.project.status === "active" && detail.access.permission === "edit";
  const canComplete =
    detail.project.status === "active" && detail.access.permission !== "view";
  const items = detail.items ?? [],
    tasks = items.filter((i) => i.type === "task"),
    completed = tasks.filter((i) => i.completed).length;
  const visible = items.filter(
    (item) =>
      (filter === "all" ||
        (filter === "important" && item.important) ||
        item.type === filter) &&
      (!hideCompleted || !item.completed),
  );
  async function update(item: ProjectItem, value: Partial<ProjectItem>) {
    if (busy) return;
    setBusy(item.id);
    try {
      await patch(`/items/${item.id}${shareQuery(token)}`, value);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Links & tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Useful references, important details and next steps.
          </p>
        </div>
        {canEdit && (
          <ItemDialog
            projectId={detail.project.id}
            token={token}
            onChange={onChange}
          />
        )}
      </div>
      {tasks.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {completed} of {tasks.length} tasks complete
          </p>
          <Progress
            aria-label="Task completion"
            value={(completed / tasks.length) * 100}
            className="h-2"
          />
        </div>
      )}
      {!items.length && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <ListTodo className="mx-auto mb-4 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">Keep the next step in sight</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add reference links or a short checklist for everyone reviewing this
            project.
          </p>
        </div>
      )}
      {items.length > 0 && (
        <ItemFilters
          filter={filter}
          setFilter={setFilter}
          hideCompleted={hideCompleted}
          setHideCompleted={setHideCompleted}
        />
      )}
      {items.length > 0 && !visible.length && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No items match these filters.
        </p>
      )}
      <ol className="space-y-3">
        {visible.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-card p-4",
              item.important && "border-amber-500/40 bg-amber-500/5",
            )}
          >
            <span className="mt-0.5 w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
              {items.findIndex((i) => i.id === item.id) + 1}.
            </span>
            {item.type === "task" ? (
              <Checkbox
                className="mt-0.5"
                aria-label={`Complete ${item.title}`}
                checked={item.completed}
                disabled={!canComplete || !!busy}
                onCheckedChange={(v) =>
                  void update(item, { completed: v === true })
                }
              />
            ) : (
              <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {item.type === "link" ? (
                  <a
                    className="inline-flex items-center gap-1 break-words text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    href={item.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                    <ArrowUpRight className="size-3.5 shrink-0" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span
                    className={cn(
                      "break-words text-sm font-medium",
                      item.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </span>
                )}
                {item.important && (
                  <Badge variant="outline" className="text-xs">
                    Important
                  </Badge>
                )}
              </div>
              {item.note && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {item.note}
                </p>
              )}
              {item.type === "link" && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.url}
                </p>
              )}
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!!busy}
                  aria-label={
                    item.important
                      ? `Unmark ${item.title} as important`
                      : `Mark ${item.title} as important`
                  }
                  aria-pressed={item.important}
                  onClick={() =>
                    void update(item, { important: !item.important })
                  }
                >
                  <Star
                    className={cn(
                      "size-4",
                      item.important && "fill-amber-500 text-amber-600",
                    )}
                  />
                </Button>
                <ItemDialog
                  projectId={detail.project.id}
                  item={item}
                  token={token}
                  onChange={onChange}
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
