import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, ShieldCheck, Search, X } from "lucide-react";
import type { AuditPage } from "@sendfold/shared/audit";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loading, ErrorBox } from "@/components/common";
import { exportCsv } from "./common";
import { Visitors } from "./visitors";
import { EventsTable } from "./events-table";
import {
  FilterSelect,
  identityOptions,
  countryOptions,
  periodOptions,
} from "./filter-select";

export function ProjectActivity({ projectId }: { projectId: string }) {
  const cache = useQueryClient();
  const [view, setView] = useState("events"),
    [search, setSearch] = useState(""),
    [action, setAction] = useState("all"),
    [kind, setKind] = useState("all"),
    [country, setCountry] = useState("all"),
    [actor, setActor] = useState(""),
    [period, setPeriod] = useState("all"),
    [cursors, setCursors] = useState<string[]>([]);
  const params = new URLSearchParams({ search });
  if (action !== "all") params.set("action", action);
  if (kind !== "all") params.set("kind", kind);
  if (country !== "all") params.set("country", country);
  if (actor) params.set("actor", actor);
  if (period !== "all")
    params.set("from", String(Date.now() - Number(period) * 86400000));
  const cursor = cursors.at(-1);
  if (cursor) params.set("cursor", cursor);
  const result = useQuery({
    queryKey: [
      "audit",
      projectId,
      search,
      action,
      kind,
      country,
      actor,
      period,
      cursor,
    ],
    queryFn: () => api<AuditPage>(`/projects/${projectId}/audit?${params}`),
    refetchInterval: cursor ? false : 20_000,
  });
  const data = result.data;
  const filtered =
    !!search ||
    !!actor ||
    [action, kind, country, period].some((v) => v !== "all");
  function change(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setCursors([]);
    };
  }
  function clear() {
    setSearch("");
    setAction("all");
    setKind("all");
    setCountry("all");
    setActor("");
    setPeriod("all");
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
            <ShieldCheck className="size-4 text-primary" />
            Activity & visitors
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access, actions and people — visible to project administrators.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void result.refetch();
            void cache.invalidateQueries({ queryKey: ["visitors", projectId] });
          }}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="events">Event history</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
        </TabsList>
        <TabsContent value="visitors" className="pt-4">
          <Visitors
            projectId={projectId}
            onSelect={(key) => {
              clear();
              setActor(key);
              setView("events");
            }}
          />
        </TabsContent>
        <TabsContent value="events" className="space-y-4 pt-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <div className="relative sm:col-span-2">
              <Search
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search activity"
                value={search}
                maxLength={120}
                className="pl-9"
                placeholder="Search name, email, IP or details…"
                onChange={(e) => change(setSearch)(e.target.value)}
              />
            </div>
            <FilterSelect
              label="Filter action"
              value={action}
              onChange={change(setAction)}
              options={[
                ["all", "All actions"],
                ...(data?.actions ?? []).map((a) => [a, a]),
              ]}
            />
            <FilterSelect
              label="Filter visitor type"
              value={kind}
              onChange={change(setKind)}
              options={identityOptions}
            />
            <FilterSelect
              label="Filter country"
              value={country}
              onChange={change(setCountry)}
              options={countryOptions(data?.countries ?? [])}
            />
            <FilterSelect
              label="Filter time"
              value={period}
              onChange={change(setPeriod)}
              options={periodOptions}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {data?.total ?? 0} matching{" "}
              {data?.total === 1 ? "event" : "events"}
              {actor ? " · One visitor selected" : " · All visitors"}
            </p>
            <div className="flex gap-2">
              {filtered && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <X className="size-3.5" />
                  Reset filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.events.length}
                onClick={exportPage}
              >
                <Download className="size-3.5" />
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
              <EventsTable
                events={data?.events ?? []}
                onSelect={change(setActor)}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {data?.events.length
                    ? `${cursors.length * 50 + 1}–${cursors.length * 50 + data.events.length} of ${data.total} events`
                    : "No matching events"}{" "}
                  · Times are local
                </span>
                <div className="flex gap-2">
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
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      <details className="text-xs leading-5 text-muted-foreground">
        <summary className="w-fit cursor-pointer">About these records</summary>
        <p className="mt-2 max-w-4xl">
          Earlier activity keeps unknown details where they were not recorded.
          Repeated project/file loads are grouped into five-minute windows;
          blocked password attempts are grouped per minute. Downloads record
          requests, not proof of reading. Activity inside uploaded HTML and
          typing is not recorded. Device labels are inferred from the reported
          browser.
        </p>
      </details>
    </section>
  );
}
