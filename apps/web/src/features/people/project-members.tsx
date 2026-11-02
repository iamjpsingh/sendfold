import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, X } from "lucide-react";
import { toast } from "sonner";
import type { ProjectMember } from "@sendfold/shared/types";
import { api } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { Busy, ErrorBox, Loading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export function ProjectMembers({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [role, setRole] = useState("editor");
  const me = useMe();
  const path = `/projects/${projectId}/members`;
  const members = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => api<ProjectMember[]>(path),
    enabled: open,
  });
  async function update(email: string, nextRole: string) {
    await api(path, {
      method: "PUT",
      body: JSON.stringify({ email, role: nextRole }),
    });
    await members.refetch();
  }
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      await update(String(new FormData(form).get("email")), role);
      form.reset();
      toast.success("Project access updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function change(member: ProjectMember, nextRole?: string) {
    setBusy(true);
    try {
      if (nextRole) await update(member.email, nextRole);
      else {
        await api(`${path}/${member.id}`, { method: "DELETE" });
        await members.refetch();
      }
      toast.success(nextRole ? "Role updated" : "Project access removed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="size-4" />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Project members</DialogTitle>
          <DialogDescription>
            Grant access to an existing account. Super admins already have
            access to every project.
          </DialogDescription>
        </DialogHeader>
        {members.isPending ? (
          <Loading />
        ) : members.error ? (
          <ErrorBox error={members.error} />
        ) : (
          <div className="max-h-64 space-y-3 overflow-auto">
            {!members.data.length && (
              <p className="py-3 text-sm text-muted-foreground">
                No members yet. Add someone below.
              </p>
            )}
            {members.data.map((member) => (
              <div className="flex items-center gap-2" key={member.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.name}{" "}
                    {member.disabled && (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <Select
                  value={member.role}
                  onValueChange={(value) => void change(member, value)}
                  disabled={busy || member.id === me.data?.user.id}
                >
                  <SelectTrigger
                    className="w-28"
                    aria-label={`Role for ${member.name}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <RoleOptions />
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${member.name}`}
                  disabled={busy || member.id === me.data?.user.id}
                  onClick={() => void change(member)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={add} className="space-y-3 border-t pt-4">
          <Label htmlFor="member-email">Account email</Label>
          <Input
            id="member-email"
            name="email"
            type="email"
            required
            placeholder="teammate@example.com"
          />
          <div className="flex gap-2">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="flex-1" aria-label="New member role">
                <SelectValue />
              </SelectTrigger>
              <RoleOptions />
            </Select>
            <Button disabled={busy}>
              <Busy busy={busy}>Grant access</Busy>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Admin: manage this project. Editor: upload, edit and respond.
            Viewer: view and download.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function RoleOptions() {
  return (
    <SelectContent>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="editor">Editor</SelectItem>
      <SelectItem value="viewer">Viewer</SelectItem>
    </SelectContent>
  );
}
