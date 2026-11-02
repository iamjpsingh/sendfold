import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Share } from "@sendfold/shared/types";
import { api, post, randomPassword, date } from "@/lib/api";
import { Busy, ErrorBox } from "@/components/common";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function ShareDialog({
  projectId,
  locked,
}: {
  projectId: string;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false),
    [password, setPassword] = useState(randomPassword),
    [permission, setPermission] = useState("comment");
  const [download, setDownload] = useState(true),
    [upload, setUpload] = useState(false),
    [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [created, setCreated] = useState<{ link: string; password: string }>();
  const query = useQueryClient();
  const shares = useQuery({
    queryKey: ["shares", projectId],
    queryFn: () => api<Share[]>(`/projects/${projectId}/shares`),
    enabled: open,
  });
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const form = new FormData(e.currentTarget);
      const share = await post<Share>(`/projects/${projectId}/shares`, {
        label: form.get("label"),
        password,
        permission,
        allowDownload: download,
        allowUpload: upload,
        expiresAt: days === "0" ? null : Date.now() + Number(days) * 86400000,
      });
      setCreated({ link: `${location.origin}/s/${share.token}`, password });
      setPassword(randomPassword());
      await query.invalidateQueries({ queryKey: ["shares", projectId] });
      await query.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Select and copy the text manually.");
    }
  }
  async function revoke(id: string) {
    try {
      await api(`/shares/${id}`, { method: "DELETE" });
      await shares.refetch();
      toast.success("Link revoked. Existing guest sessions are closed.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Link2 className="size-4" />
          Share project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>One link. The right access.</DialogTitle>
          <DialogDescription>
            Every link has its own password and permissions.
          </DialogDescription>
        </DialogHeader>
        {created && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4" />
              Your link is ready
            </p>
            {[
              { label: "Share link", value: created.link },
              { label: "Password — save it now", value: created.password },
            ].map((item) => (
              <div className="space-y-1" key={item.label}>
                <Label>{item.label}</Label>
                <div className="flex gap-2">
                  <Input readOnly value={item.value} />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Copy ${item.label}`}
                    onClick={() => copy(item.value)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Passwords cannot be retrieved later.
            </p>
          </div>
        )}
        {!locked && (
          <form onSubmit={create} className="space-y-4">
            {!!error && <ErrorBox error={error} />}
            <div className="space-y-2">
              <Label htmlFor="link-label">Link label</Label>
              <Input
                id="link-label"
                name="label"
                required
                placeholder="Client review"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="share-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  aria-label="Generate password"
                  onClick={() => setPassword(randomPassword())}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="comment">Comment & answer</SelectItem>
                    <SelectItem value="edit">Edit & comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires after</Label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ["1", "1 day"],
                      ["7", "7 days"],
                      ["30", "30 days"],
                      ["0", "Never"],
                    ].map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-download">Show download button</Label>
              <Switch
                id="allow-download"
                checked={download}
                onCheckedChange={setDownload}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-upload">Allow uploading files</Label>
              <Switch
                id="allow-upload"
                checked={upload}
                onCheckedChange={setUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Previewed content can still be saved or captured by the recipient.
            </p>
            <Button disabled={busy} className="w-full">
              <Busy busy={busy}>Create protected link</Busy>
            </Button>
          </form>
        )}
        <Separator />
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Existing links</h3>
          {shares.error && <ErrorBox error={shares.error} />}{" "}
          {!shares.data?.length && (
            <p className="text-sm text-muted-foreground">
              No links created yet.
            </p>
          )}
          {shares.data?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">
                  {s.revokedAt
                    ? "Revoked"
                    : s.expiresAt && s.expiresAt < Date.now()
                      ? "Expired"
                      : `${s.permission} · ${s.expiresAt ? `until ${date(s.expiresAt)}` : "no expiry"}`}
                </p>
              </div>
              {!s.revokedAt && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Copy link"
                    onClick={() => copy(`${location.origin}/s/${s.token}`)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(s.id)}
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
