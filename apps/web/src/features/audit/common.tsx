import type { ActorKind } from "@sendfold/shared/audit";
import { Badge } from "@/components/ui/badge";
import { csv } from "@/lib/csv";
import { downloadBlob } from "@/lib/api";

export function ActorBadge({ kind }: { kind: ActorKind }) {
  const labels: Record<ActorKind, string> = {
    member: "Team account",
    guest: "Guest · self-reported",
    anonymous: "Anonymous",
    connector: "AI connection",
    legacy: "Earlier record",
  };
  return (
    <Badge variant="secondary" className="font-normal">
      {labels[kind] ?? kind}
    </Badge>
  );
}
export function Timestamp({ value }: { value: number }) {
  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={new Date(value).toISOString()}
      className="text-xs text-muted-foreground"
    >
      {new Date(value).toLocaleString()}
    </time>
  );
}
export function exportCsv(name: string, rows: string[][]) {
  downloadBlob(
    new Blob([csv(rows)], {
      type: "text/csv;charset=utf-8",
    }),
    name,
  );
}
export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
