import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Share, ProjectFile } from "@sendfold/shared/types";
import { api, post, randomPassword } from "@/lib/api";
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
import { ShareScope } from "./share-scope";
import { ShareLinks } from "./share-links";

export function ShareDialog({
  projectId,
  locked,
  files = [],
  initialFileId,
}: {
  projectId: string;
  locked: boolean;
  files?: ProjectFile[];
  initialFileId?: string;
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
  const [fileId, setFileId] = useState(initialFileId ?? "project"),
    [viewMode, setViewMode] = useState<"compact" | "full">("compact");
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
        fileId: fileId === "project" ? null : fileId,
        viewMode,
        allowDownload: download,
        allowUpload: fileId === "project" && upload,
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
        <Button
          variant={initialFileId ? "outline" : "default"}
          size={initialFileId ? "sm" : "default"}
        >
          <Link2 className="size-4" />
          {initialFileId ? "Share file" : "Share project"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a protected link</DialogTitle>
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
                <Label htmlFor={item.label}>{item.label}</Label>
                <div className="flex gap-2">
                  <Input id={item.label} readOnly value={item.value} />
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
            <ShareScope
              files={files}
              fileId={fileId}
              setFileId={setFileId}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
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
                  aria-describedby="share-password-help"
                  className="font-mono"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
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
            <p
              id="share-password-help"
              className="text-xs text-muted-foreground"
            >
              Generated passwords use 12 random characters: uppercase and
              lowercase letters, numbers and symbols. Keep this password or use
              a longer, unique one.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="share-permission">Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger id="share-permission">
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
                <Label htmlFor="share-expiry">Expires after</Label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger id="share-expiry">
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
                disabled={fileId !== "project"}
                checked={fileId === "project" && upload}
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
        <ShareLinks
          shares={shares.data}
          error={shares.error}
          files={files}
          onCopy={copy}
          onRevoke={revoke}
        />
      </DialogContent>
    </Dialog>
  );
}
