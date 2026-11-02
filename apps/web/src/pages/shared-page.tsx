import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { api, post, ApiError } from "@/lib/api";
import { Brand, Busy, Loading, ErrorBox } from "@/components/common";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectPage } from "./project-page";

export function SharedPage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const session = useQuery({
    queryKey: ["guest", token],
    queryFn: () => api<{ projectId: string }>(`/shared/${token}/session`),
    retry: false,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await post(
        `/shared/${token}/unlock`,
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      await session.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (session.isPending) return <Loading />;
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex items-center justify-between border-b bg-background px-6 py-5">
        <Brand />
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" />
          Protected project
        </span>
      </header>
      {session.data ? (
        <ProjectPage projectId={session.data.projectId} token={token} />
      ) : (
        <main className="mx-auto max-w-md px-5 py-20">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
                <LockKeyhole className="size-5" />
              </div>
              <CardTitle>A little privacy. A lot of possibility.</CardTitle>
              <CardDescription>
                Enter the password shared with you. No account needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.error instanceof ApiError &&
              session.error.status === 404 ? (
                <ErrorBox error={session.error} />
              ) : (
                <form className="space-y-5" onSubmit={unlock}>
                  {!!error && <ErrorBox error={error} />}
                  <div className="space-y-2">
                    <Label htmlFor="guest-password">Project password</Label>
                    <Input
                      id="guest-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">
                      Your name{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="guest-name"
                      name="name"
                      maxLength={100}
                      placeholder="So the team knows who left feedback"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    <Busy busy={busy}>Open project</Busy>
                    <ArrowRight className="size-4" />
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Your access lasts up to 8 hours. Feedback is attributed to
                    the name you provide.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      )}
    </div>
  );
}
