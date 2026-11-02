import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { post } from "@/lib/api";
import { Busy } from "@/components/common";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
export function AddQuestion({
  projectId,
  onChange,
}: {
  projectId: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false),
    [type, setType] = useState("approval"),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await post(`/projects/${projectId}/questions`, {
        prompt: form.get("prompt"),
        type,
        options: String(form.get("options") ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setOpen(false);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add question
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask for a clear response</DialogTitle>
          <DialogDescription>
            Add a question or an approval to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question-prompt">Question</Label>
            <Textarea
              id="question-prompt"
              name="prompt"
              required
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label>Response type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  ["approval", "Approval"],
                  ["text", "Written response"],
                  ["single", "Choose one"],
                  ["multiple", "Choose multiple"],
                ].map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {["single", "multiple"].includes(type) && (
            <div className="space-y-2">
              <Label htmlFor="question-options">Options, one per line</Label>
              <Textarea
                id="question-options"
                name="options"
                required
                placeholder={"Desktop website\nMobile website"}
              />
            </div>
          )}
          <Button disabled={busy}>
            <Busy busy={busy}>Add question</Busy>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
