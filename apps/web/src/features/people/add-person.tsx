import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { post, randomPassword } from "@/lib/api";
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
export function AddPerson({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState(false),
    [role, setRole] = useState("member"),
    [password, setPassword] = useState(randomPassword),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      await post("/people", {
        name: form.get("name"),
        email: form.get("email"),
        role,
        password,
      });
      toast.success(
        "Account created. Share the password privately with this person.",
      );
      setOpen(false);
      setPassword(randomPassword());
      onChange();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Add person
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add someone to Sendfold</DialogTitle>
          <DialogDescription>
            Create an account, then assign access from each project’s Members
            button.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!!error && <ErrorBox error={error} />}
          <div className="space-y-2">
            <Label htmlFor="person-name">Name</Label>
            <Input id="person-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="person-email">Email</Label>
            <Input id="person-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="super_admin">
                  Super admin — all projects
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="person-password">
              Initial password — save before creating
            </Label>
            <Input
              id="person-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            No email is sent automatically. They can change this password in
            Settings.
          </p>
          <Button disabled={busy}>
            <Busy busy={busy}>Create account</Busy>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
