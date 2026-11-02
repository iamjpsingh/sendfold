import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { post } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { PageTitle, Busy } from "@/components/common";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConnectionPanel } from "@/features/connectors/connection-panel";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
export function SettingsPage() {
  const { theme, setTheme } = useTheme(),
    { data } = useMe(),
    [busy, setBusy] = useState(false);
  async function password(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      await post("/auth/change-password", {
        ...values,
        revokeOtherSessions: true,
      });
      form.reset();
      toast.success("Password updated. Other sessions have been signed out.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      <PageTitle title="Settings" description="Make Sendfold feel at home." />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose the theme for this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Use system setting</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Account security</CardTitle>
          <CardDescription>Signed in as {data?.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={password} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                type="password"
                id="current-password"
                name="currentPassword"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                type="password"
                id="new-password"
                name="newPassword"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </div>
            <Button disabled={busy}>
              <Busy busy={busy}>Update password</Busy>
            </Button>
          </form>
        </CardContent>
      </Card>
      <ConnectionPanel />
    </main>
  );
}
