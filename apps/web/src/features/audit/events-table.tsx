import {
  Eye,
  Download,
  MessageSquare,
  Pencil,
  LockKeyhole,
  FileUp,
  Activity,
} from "lucide-react";
import type { AuditEvent } from "@sendfold/shared/audit";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PersonCell, LocationCell, DeviceCell, TableTime } from "./table-cells";
import { RecordDetails } from "./record-details";

function ActionBadge({ action }: { action: string }) {
  const failed = /failed|blocked|revoked/.test(action);
  const Icon = /download/.test(action)
    ? Download
    : /upload/.test(action)
      ? FileUp
      : /answer|edit|update/.test(action)
        ? Pencil
        : /comment/.test(action)
          ? MessageSquare
          : /unlock/.test(action)
            ? LockKeyhole
            : /view|open|load/.test(action)
              ? Eye
              : Activity;
  return (
    <Badge
      variant="outline"
      className={
        failed
          ? "gap-1.5 border-destructive/20 bg-destructive/5 font-normal text-destructive"
          : "gap-1.5 border-primary/10 bg-primary/5 font-normal text-primary"
      }
    >
      <Icon className="size-3" aria-hidden="true" />
      {action}
    </Badge>
  );
}
export function EventsTable({
  events,
  onSelect,
}: {
  events: AuditEvent[];
  onSelect: (actor: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card [&_[data-slot=table-container]]:max-h-[560px]">
      <Table className="min-w-[1040px]">
        <TableCaption className="sr-only">
          Project event history. Times are shown in your local timezone.
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent [&_th]:px-3 [&_th]:text-xs">
            <TableHead>Person</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>File / details</TableHead>
            <TableHead>Location / IP</TableHead>
            <TableHead>Device / browser</TableHead>
            <TableHead>When</TableHead>
            <TableHead className="sticky right-0 bg-muted">
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id} className="group [&_td]:px-3 [&_td]:py-3">
              <TableCell>
                <PersonCell
                  person={event}
                  onSelect={() => onSelect(event.actorKey)}
                />
              </TableCell>
              <TableCell>
                <ActionBadge action={event.action} />
              </TableCell>
              <TableCell>
                <p className="max-w-48 truncate text-xs" title={event.detail}>
                  {event.detail}
                </p>
                <p className="mt-1 max-w-48 truncate text-[11px] text-muted-foreground">
                  {event.shareLabel
                    ? `Link: ${event.shareLabel}`
                    : "Project activity"}
                </p>
              </TableCell>
              <TableCell>
                <LocationCell {...event} />
              </TableCell>
              <TableCell>
                <DeviceCell userAgent={event.userAgent} />
              </TableCell>
              <TableCell>
                <TableTime value={event.createdAt} />
              </TableCell>
              <TableCell className="sticky right-0 border-l bg-card group-hover:bg-muted">
                <RecordDetails record={event} />
              </TableCell>
            </TableRow>
          ))}
          {!events.length && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-32 text-center text-muted-foreground"
              >
                No events match these filters. Try a broader search or reset the
                filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
