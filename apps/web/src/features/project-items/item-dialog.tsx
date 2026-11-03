import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import type { ProjectItem } from "@sendfold/shared/types";
import { post, patch, shareQuery } from "@/lib/api";
import { Busy, ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
export function ItemDialog({
  projectId,
  token,
  item,
  onChange,
}: {
  projectId: string;
  token?: string;
  item?: ProjectItem;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false),
    [type, setType] = useState(item?.type ?? "link"),
    [important, setImportant] = useState(item?.important ?? false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const values = {
      type,
      title: form.get("title"),
      note: form.get("note"),
      url: type === "link" ? form.get("url") : null,
      important,
    };
    setBusy(true);
    setError(null);
    try {
      if (item) await patch(`/items/${item.id}${shareQuery(token)}`, values);
      else
        await post(`/projects/${projectId}/items${shareQuery(token)}`, values);
      onChange();
      setOpen(false);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        {item ? (
          <Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Add link or task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add link or task"}</DialogTitle>
          <DialogDescription>
            Keep useful resources and next steps together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "link" | "task")}
              >
                <SelectTrigger id="item-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Website link</SelectItem>
                  <SelectItem value="task">To-do task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-title">Title</Label>
              <Input
                id="item-title"
                name="title"
                required
                maxLength={200}
                defaultValue={item?.title}
                placeholder={
                  type === "link" ? "Design reference" : "Review the proposal"
                }
              />
            </div>
            {type === "link" && (
              <div className="space-y-2">
                <Label htmlFor="item-url">Website address</Label>
                <Input
                  id="item-url"
                  name="url"
                  type="url"
                  required
                  maxLength={2000}
                  defaultValue={item?.url ?? ""}
                  placeholder="https://example.com"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="item-note">
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="item-note"
                name="note"
                maxLength={2000}
                defaultValue={item?.note}
                placeholder="Add context or instructions…"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="item-important">Mark as important</Label>
              <Switch
                id="item-important"
                checked={important}
                onCheckedChange={setImportant}
              />
            </div>
          </fieldset>
          {error && <ErrorBox error={error} />}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={busy}>
              <Busy busy={busy}>{item ? "Save changes" : "Add item"}</Busy>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
