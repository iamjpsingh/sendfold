import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { post } from "@/lib/api";
import { Busy, ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectSelection } from "./project-selection";

export function ConnectionForm() {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [label, setLabel] = useState("Codex"),
    [projectIds, setProjects] = useState<string[]>([]);
  const [allowWrite, setWrite] = useState(false),
    [days, setDays] = useState("30");
  const [token, setToken] = useState(""),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await post<{ token: string }>("/connections", {
        label,
        projectIds,
        allowWrite,
        days: Number(days),
      });
      setToken(result.token);
      await cache.invalidateQueries({ queryKey: ["connections"] });
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setToken("");
          setError(undefined);
          setWrite(false);
          setProjects([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Create access key</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {token ? "Save your access key" : "New AI connection"}
          </DialogTitle>
          <DialogDescription>
            {token
              ? "This key is shown once. Store it in your AI client's environment or secret settings."
              : "For apps that support a bearer token. Browser authorization needs no manual key."}
          </DialogDescription>
        </DialogHeader>
        {token ? (
          <div className="space-y-4">
            <Input
              readOnly
              type="password"
              value={token}
              aria-label="New access key"
              autoComplete="off"
            />
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(token);
                  toast.success("Access key copied");
                } catch {
                  toast.error("Could not copy. Select the key manually.");
                }
              }}
            >
              Copy access key
            </Button>
            <p className="text-xs text-muted-foreground">
              Keep this key private. It is separate from your Sendfold password
              and can be revoked here at any time.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setToken("");
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={create} className="space-y-5">
            {!!error && <ErrorBox error={error} />}
            <div className="space-y-2">
              <Label htmlFor="connection-name">Connection name</Label>
              <Input
                id="connection-name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <ProjectSelection
              selected={projectIds}
              onChange={setProjects}
              allowWrite={allowWrite}
              onWrite={setWrite}
            />
            <div className="space-y-2">
              <Label htmlFor="connection-expiry">Expires in</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger id="connection-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 30, 90].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy || !projectIds.length}>
              <Busy busy={busy}>Create access key</Busy>
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
