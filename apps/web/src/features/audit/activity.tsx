import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import type { AuditPage } from "@sendfold/shared/audit";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loading, ErrorBox } from "@/components/common";
import { ActorBadge, Timestamp, Stat, exportCsv } from "./common";
import { Visitors } from "./visitors";

export function ProjectActivity({ projectId }: { projectId: string }) {
  const [view, setView] = useState("events"),
    [search, setSearch] = useState(""),
    [action, setAction] = useState("all"),
    [actor, setActor] = useState(""),
    [period, setPeriod] = useState("all"),
    [cursors, setCursors] = useState<string[]>([]);
  const params = new URLSearchParams({ search });
  if (action !== "all") params.set("action", action);
  if (actor) params.set("actor", actor);
  if (period !== "all")
    params.set("from", String(Date.now() - Number(period) * 86400000));
  const cursor = cursors.at(-1);
  if (cursor) params.set("cursor", cursor);
  const result = useQuery({
    queryKey: ["audit", projectId, search, action, actor, period, cursor],
    queryFn: () => api<AuditPage>(`/projects/${projectId}/audit?${params}`),
    refetchInterval: cursor ? false : 20_000,
  });
  const data = result.data;
  function reset() {
    setCursors([]);
  }
  function exportPage() {
    if (!data) return;
    exportCsv("activity-page.csv", [
      [
        "Time (UTC)",
        "Person",
        "Type",
        "Email",
        "Link",
        "Action",
        "Details",
        "IP",
        "Country",
        "Browser",
      ],
      ...data.events.map((e) => [
        new Date(e.createdAt).toISOString(),
        e.actorName,
        e.actorKind,
        e.actorEmail ?? "",
        e.shareLabel ?? "",
        e.action,
        e.detail,
        e.ipAddress ?? "",
        e.country ?? "",
        e.userAgent ?? "",
      ]),
    ]);
  }
  return (
    <section className="space-y-5" aria-label="Project activity history">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" />
            Activity & visitors
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An admin-only history of access and actions in this project.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void result.refetch()}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Matching events" value={data.total} />
          <Stat label="Recorded visitor identities" value={data.visitorCount} />
        </div>
      )}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="events">Event history</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
        </TabsList>
        <TabsContent value="visitors" className="pt-4">
          <Visitors
            projectId={projectId}
            onSelect={(key) => {
              setSearch("");
              setAction("all");
              setPeriod("all");
              setActor(key);
              reset();
              setView("events");
            }}
          />
        </TabsContent>
        <TabsContent value="events" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_150px]">
            <Input
              aria-label="Search activity"
              value={search}
              maxLength={120}
              placeholder="Search person, email, IP or action details…"
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
            />
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                reset();
              }}
            >
              <SelectTrigger aria-label="Filter action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {data?.actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={period}
              onValueChange={(v) => {
                setPeriod(v);
                reset();
              }}
            >
              <SelectTrigger aria-label="Filter time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {actor ? "Showing one visitor’s history" : "Showing all visitors"}
            </p>
            <div className="flex gap-2">
              {actor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActor("");
                    reset();
                  }}
                >
                  Clear visitor filter
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.events.length}
                onClick={exportPage}
              >
                <Download className="size-4" />
                Export this page
              </Button>
            </div>
          </div>
          {result.isPending ? (
            <Loading />
          ) : result.error ? (
            <ErrorBox error={result.error} />
          ) : (
            <>
              <div className="space-y-3">
                {data?.events.map((e) => (
                  <article
                    key={e.id}
                    className="space-y-3 rounded-lg border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="link"
                          className="h-auto p-0 font-medium"
                          onClick={() => {
                            setActor(e.actorKey);
                            reset();
                          }}
                        >
                          {e.actorName}
                        </Button>
                        <ActorBadge kind={e.actorKind} />
                        <span className="text-sm">{e.action}</span>
                      </div>
                      <Timestamp value={e.createdAt} />
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {e.detail}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{e.actorEmail || "Email not provided"}</span>
                      <span className="font-mono">
                        {e.ipAddress || "IP not recorded"}
                      </span>
                      {e.country && <span>{e.country}</span>}
                      {e.shareLabel && <span>Link: {e.shareLabel}</span>}
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Browser & record details
                      </summary>
                      <p className="mt-2 break-words">
                        {e.userAgent || "Browser not recorded"}
                      </p>
                      <p className="mt-1 break-all text-muted-foreground">
                        Record {e.id}
                        {e.resourceId ? ` · Resource ${e.resourceId}` : ""}
                      </p>
                    </details>
                  </article>
                ))}
              </div>
              {!data?.events.length && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No activity matches these filters.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!cursors.length}
                  onClick={() => setCursors(cursors.slice(0, -1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data?.nextCursor}
                  onClick={() =>
                    data?.nextCursor &&
                    setCursors([...cursors, data.nextCursor])
                  }
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      <p className="text-xs leading-5 text-muted-foreground">
        Earlier activity is preserved with unknown identity/IP where it was not
        recorded. Repeated project/file loads are grouped into five-minute
        windows; blocked password attempts are grouped per minute. Downloads
        record requests, not proof that a person read or saved the file.
        Activity inside uploaded HTML, typing and other websites is not
        recorded.
      </p>
    </section>
  );
}
