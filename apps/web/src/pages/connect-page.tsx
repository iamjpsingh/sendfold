import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/lib/queries";
import { post, ApiError } from "@/lib/api";
import { AuthPage } from "./auth-page";
import { Brand, Busy, ErrorBox, Loading } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectSelection } from "@/features/connectors/project-selection";

export function ConnectPage() {
  const me = useMe();
  const query = window.location.search.slice(1);
  const request = useQuery({
    queryKey: ["connect-request", query, me.data?.user.id],
    enabled: !!me.data && !!query,
    queryFn: () =>
      post<{
        label: string;
        clientId: string;
        scopes: string[];
        redirectUri: string;
      }>("/connections/request", { query }),
    retry: false,
  });
  const [projectIds, setProjects] = useState<string[]>([]),
    [allowWrite, setWrite] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function consent(accept: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await post<{ url: string }>("/connections/authorize", {
        query,
        accept,
        projectIds,
        allowWrite,
      });
      window.location.assign(result.url);
    } catch (error) {
      setError(error);
      setBusy(false);
    }
  }
  if (me.isPending) return <Loading />;
  if (me.error instanceof ApiError && me.error.status === 401)
    return <AuthPage oauthQuery={query} />;
  return (
    <main className="min-h-screen bg-primary/5 px-5 py-10">
      <div className="mx-auto max-w-lg space-y-8">
        <Brand />
        <Card>
          <CardHeader>
            <CardTitle>
              Connect {request.data?.label ?? "your AI app"}
            </CardTitle>
            <CardDescription>
              Review access before sharing your projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {me.error && <ErrorBox error={me.error} />}
            {request.error && <ErrorBox error={request.error} />}
            {!!error && <ErrorBox error={error} />}
            {!query && (
              <p className="text-sm">
                Start the connection from your AI app using the MCP URL in
                Sendfold Settings.
              </p>
            )}
            {query && request.isPending && !me.error && <Loading />}
            {request.data && (
              <>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5">
                  <p>Signed in as {me.data?.user.email}</p>
                  <p className="break-all">App: {request.data.label}</p>
                  <p className="break-all text-muted-foreground">
                    Returns to: {request.data.redirectUri}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    This app's name is supplied by its developer. Only approve
                    an app you intended to connect.
                  </p>
                </div>
                <ProjectSelection
                  selected={projectIds}
                  onChange={setProjects}
                  allowWrite={allowWrite}
                  onWrite={setWrite}
                  canWrite={request.data.scopes.includes("sendfold:write")}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Approval lasts up to 90 days. You can revoke it at any time in
                  Settings → AI connectors.
                </p>
                <div className="flex gap-3">
                  <Button
                    disabled={busy || !projectIds.length}
                    onClick={() => consent(true)}
                  >
                    <Busy busy={busy}>Approve connection</Busy>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => consent(false)}
                  >
                    Deny
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
