import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { post } from "@/lib/api";
import { Busy } from "./common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@sendfold/shared/types";
export function ProjectDialog() {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [color, setColor] = useState("violet");
  const query = useQueryClient(),
    navigate = useNavigate();
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const p = await post<Project>("/projects", {
        ...Object.fromEntries(form),
        color,
      });
      await query.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
      toast.success("Project created");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A new place for your work</DialogTitle>
          <DialogDescription>
            Add a name now. Drop in your files whenever you’re ready.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={create} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              name="name"
              placeholder="e.g. Website redesign"
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-name">
              Client or team{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="client-name"
              name="client"
              placeholder="Who is this for?"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              name="description"
              placeholder="A little context for everyone involved."
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label>Project colour</Label>
            <div className="flex gap-2">
              {Object.entries({
                violet: "bg-violet-500",
                blue: "bg-blue-500",
                emerald: "bg-emerald-500",
                amber: "bg-amber-500",
                rose: "bg-rose-500",
              }).map(([c, style]) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`size-7 rounded-full ${style} ${color === c ? "ring-2 ring-ring ring-offset-2" : ""}`}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={busy}>
              <Busy busy={busy}>Create project</Busy>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
