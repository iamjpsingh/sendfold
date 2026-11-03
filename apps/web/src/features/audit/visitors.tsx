import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { VisitorsPage } from "@sendfold/shared/audit";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading, ErrorBox } from "@/components/common";
import { ActorBadge, Timestamp } from "./common";

export function Visitors({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (actor: string) => void;
}) {
  const [offset, setOffset] = useState(0),
    [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["visitors", projectId, offset, search],
    queryFn: () =>
      api<VisitorsPage>(
        `/projects/${projectId}/visitors?${new URLSearchParams({ offset: String(offset), search })}`,
      ),
    refetchInterval: 20_000,
  });
  return (
    <div className="space-y-4">
      <Input
        aria-label="Search visitors"
        placeholder="Search name, email or IP…"
        maxLength={120}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOffset(0);
        }}
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {query.data.visitors.map((v) => (
              <article
                key={v.actorKey}
                className="space-y-3 rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{v.actorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.actorEmail || "Email not provided"}
                    </p>
                  </div>
                  <ActorBadge kind={v.actorKind} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="mb-1 text-muted-foreground">First recorded</p>
                    <Timestamp value={v.firstSeen} />
                  </div>
                  <div>
                    <p className="mb-1 text-muted-foreground">Last recorded</p>
                    <Timestamp value={v.lastSeen} />
                  </div>
                </div>
                <p className="break-all font-mono text-xs">
                  {v.ipAddress || "IP not recorded"}
                  {v.country ? ` · ${v.country}` : ""}
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Browser details
                  </summary>
                  <p className="mt-2 break-words">
                    {v.userAgent || "Not recorded"}
                  </p>
                </details>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {v.eventCount} events
                    {v.shareLabel ? ` · ${v.shareLabel}` : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelect(v.actorKey)}
                  >
                    View history
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!query.data.visitors.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No visitor records match this view.
            </p>
          )}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{query.data.total} visitor identities</span>
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
      <p className="text-xs text-muted-foreground">
        These are recorded sessions/accounts, not a count of unique people.
        Shared networks, VPNs, changed browsers and self-reported guest details
        can affect identification.
      </p>
    </div>
  );
}
