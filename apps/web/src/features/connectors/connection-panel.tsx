import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ErrorBox, Loading } from "@/components/common";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConnectionForm } from "./connection-form";

interface Connection {
  id: string;
  label: string;
  clientId: string | null;
  projectIds: string[];
  allowWrite: boolean;
  expiresAt: number;
  revokedAt: number | null;
  lastUsedAt: number | null;
}
export function ConnectionPanel() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["connections"],
    queryFn: () =>
      api<{ connections: Connection[]; url: string }>("/connections"),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/connections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Connection revoked");
      return cache.invalidateQueries({ queryKey: ["connections"] });
    },
  });
  const url = query.data?.url ?? `${location.origin}/api/mcp`;
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>AI connectors</CardTitle>
        <CardDescription>
          Bring approved projects into ChatGPT, Codex, Claude and Gemini CLI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.error && <ErrorBox error={query.error} />}
        {revoke.error && <ErrorBox error={revoke.error} />}
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-48 flex-1 font-mono text-xs"
            aria-label="MCP server URL"
            value={url}
            readOnly
          />
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Server URL copied");
              } catch {
                toast.error("Could not copy the URL.");
              }
            }}
          >
            Copy URL
          </Button>
        </div>
        <Tabs defaultValue="browser">
          <TabsList>
            <TabsTrigger value="browser">ChatGPT / Claude</TabsTrigger>
            <TabsTrigger value="codex">Codex</TabsTrigger>
            <TabsTrigger value="gemini">Gemini CLI</TabsTrigger>
          </TabsList>
          <TabsContent value="browser" className="space-y-2 text-sm leading-6">
            <p>
              Add a custom MCP app or connector in your AI app, paste this URL,
              and choose OAuth with automatic client registration. Sign in to
              Sendfold, select projects, then approve access.
            </p>
            <p className="text-xs text-muted-foreground">
              Custom connectors depend on your AI app's plan and organization
              settings. No OpenAI, Anthropic or Google API key is needed in
              Sendfold.
            </p>
          </TabsContent>
          <TabsContent value="codex" className="space-y-2 text-sm">
            <p>Add Sendfold, then complete browser authorization:</p>
            <pre className="overflow-auto rounded-lg bg-muted/50 p-3 text-xs">{`codex mcp add sendfold --url ${url}\ncodex mcp login sendfold --scopes sendfold:read,sendfold:write,offline_access`}</pre>
            <p className="text-xs text-muted-foreground">
              Or create an access key below and use --bearer-token-env-var
              SENDFOLD_TOKEN when adding the server.
            </p>
          </TabsContent>
          <TabsContent value="gemini" className="space-y-2 text-sm">
            <p>
              Add this to Gemini CLI settings.json, then run /mcp auth sendfold
              inside Gemini CLI to approve access in your browser:
            </p>
            <pre className="overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
              {JSON.stringify(
                {
                  mcpServers: {
                    sendfold: {
                      httpUrl: url,
                      oauth: {
                        enabled: true,
                        scopes: [
                          "sendfold:read",
                          "sendfold:write",
                          "offline_access",
                        ],
                      },
                    },
                  },
                },
                null,
                2,
              )}
            </pre>
          </TabsContent>
        </Tabs>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Your connections</p>
          <ConnectionForm />
        </div>
        {query.isPending && <Loading />}
        {query.data?.connections.length === 0 && (
          <p className="rounded-lg border border-dashed bg-primary/5 p-5 text-sm text-muted-foreground">
            No apps connected yet. Connect through your AI app, or create a key
            for a command-line client.
          </p>
        )}
        <div className="space-y-3">
          {query.data?.connections.map((connection) => {
            const active =
              !connection.revokedAt && connection.expiresAt > Date.now();
            return (
              <div
                key={connection.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {connection.label}{" "}
                    <Badge variant="secondary">
                      {connection.revokedAt
                        ? "Revoked"
                        : !active
                          ? "Expired"
                          : connection.allowWrite
                            ? "Edits allowed"
                            : "Read only"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connection.projectIds.length} projects ·{" "}
                    {connection.clientId ? "OAuth" : "Access key"} · expires{" "}
                    {new Date(connection.expiresAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connection.lastUsedAt
                      ? `Last used ${new Date(connection.lastUsedAt).toLocaleString()}`
                      : "Not used yet"}
                  </p>
                </div>
                {active && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(connection.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Text and HTML files up to 256 KB can be read or revised. Other files
          have metadata and protected full-view links. Revoking a connection
          stops access immediately.
        </p>
      </CardContent>
    </Card>
  );
}
