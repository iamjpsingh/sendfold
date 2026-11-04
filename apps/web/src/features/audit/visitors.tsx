import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Download } from "lucide-react";
import type { VisitorsPage } from "@sendfold/shared/audit";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading, ErrorBox } from "@/components/common";
import { exportCsv } from "./common";
import { VisitorsTable } from "./visitors-table";
import {
  FilterSelect,
  identityOptions,
  countryOptions,
  periodOptions,
} from "./filter-select";

export function Visitors({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (actor: string) => void;
}) {
  const [offset, setOffset] = useState(0),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [country, setCountry] = useState("all"),
    [period, setPeriod] = useState("all"),
    [sort, setSort] = useState("recent");
  const params = new URLSearchParams({ offset: String(offset), search, sort });
  if (kind !== "all") params.set("kind", kind);
  if (country !== "all") params.set("country", country);
  if (period !== "all")
    params.set("from", String(Date.now() - Number(period) * 86400000));
  const query = useQuery({
    queryKey: [
      "visitors",
      projectId,
      offset,
      search,
      kind,
      country,
      period,
      sort,
    ],
    queryFn: () =>
      api<VisitorsPage>(`/projects/${projectId}/visitors?${params}`),
    refetchInterval: 20_000,
  });
  function change(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setOffset(0);
    };
  }
  function clear() {
    setSearch("");
    setKind("all");
    setCountry("all");
    setPeriod("all");
    setSort("recent");
    setOffset(0);
  }
  function exportPage() {
    if (!query.data) return;
    exportCsv("visitors-page.csv", [
      [
        "Person",
        "Type",
        "Email",
        "Link",
        "Latest IP",
        "Latest country",
        "User agent",
        "First seen (UTC)",
        "Last seen (UTC)",
        "Events",
      ],
      ...query.data.visitors.map((v) => [
        v.actorName,
        v.actorKind,
        v.actorEmail ?? "",
        v.shareLabel ?? "",
        v.ipAddress ?? "",
        v.country ?? "",
        v.userAgent ?? "",
        new Date(v.firstSeen).toISOString(),
        new Date(v.lastSeen).toISOString(),
        String(v.eventCount),
      ]),
    ]);
  }
  const filtered =
    !!search ||
    [kind, country, period].some((v) => v !== "all") ||
    sort !== "recent";
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search visitors"
            placeholder="Search name, email or latest IP…"
            className="pl-9"
            maxLength={120}
            value={search}
            onChange={(e) => change(setSearch)(e.target.value)}
          />
        </div>
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
          options={countryOptions(query.data?.countries ?? [])}
        />
        <FilterSelect
          label="Filter last visit"
          value={period}
          onChange={change(setPeriod)}
          options={periodOptions}
        />
        <FilterSelect
          label="Sort visitors"
          value={sort}
          onChange={change(setSort)}
          options={[
            ["recent", "Recently active"],
            ["events", "Most activity"],
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {query.data?.total ?? 0} visitor{" "}
          {query.data?.total === 1 ? "identity" : "identities"} · Latest device
          and location
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
            disabled={!query.data?.visitors.length}
            onClick={exportPage}
          >
            <Download className="size-3.5" />
            Export this page
          </Button>
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <VisitorsTable visitors={query.data.visitors} onSelect={onSelect} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {query.data.visitors.length
                ? `${offset + 1}–${offset + query.data.visitors.length} of ${query.data.total} identities`
                : "No matching visitors"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!offset}
                onClick={() => setOffset(offset - 50)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + 50 >= query.data.total}
                onClick={() => setOffset(offset + 50)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Select a visitor to see their history. Identities represent
        sessions/accounts; guest names and emails are self-reported. A shared
        network or VPN can affect the recorded location.
      </p>
    </div>
  );
}
