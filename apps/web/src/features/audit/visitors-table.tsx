import { ArrowUpRight } from "lucide-react";
import type { AuditVisitor } from "@sendfold/shared/audit";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { PersonCell, LocationCell, DeviceCell, TableTime } from "./table-cells";
import { RecordDetails } from "./record-details";

export function VisitorsTable({
  visitors,
  onSelect,
}: {
  visitors: AuditVisitor[];
  onSelect: (actor: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card [&_[data-slot=table-container]]:max-h-[560px]">
      <Table className="min-w-[980px]">
        <TableCaption className="sr-only">
          Project visitors with their latest recorded location and device.
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent [&_th]:px-3 [&_th]:text-xs">
            <TableHead>Visitor</TableHead>
            <TableHead>Latest location / IP</TableHead>
            <TableHead>Device / browser</TableHead>
            <TableHead>First seen</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead className="text-right">Events</TableHead>
            <TableHead className="sticky right-0 bg-muted">
              <span className="sr-only">Visitor actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.map((visitor) => (
            <TableRow
              key={visitor.actorKey}
              className="group [&_td]:px-3 [&_td]:py-3"
            >
              <TableCell>
                <PersonCell
                  person={visitor}
                  onSelect={() => onSelect(visitor.actorKey)}
                />
              </TableCell>
              <TableCell>
                <LocationCell {...visitor} />
              </TableCell>
              <TableCell>
                <DeviceCell userAgent={visitor.userAgent} />
              </TableCell>
              <TableCell>
                <TableTime value={visitor.firstSeen} />
              </TableCell>
              <TableCell>
                <TableTime value={visitor.lastSeen} />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {visitor.eventCount}
              </TableCell>
              <TableCell className="sticky right-0 border-l bg-card group-hover:bg-muted">
                <div className="flex items-center gap-1">
                  <RecordDetails record={visitor} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-primary"
                    aria-label={`View history for ${visitor.actorName}`}
                    onClick={() => onSelect(visitor.actorKey)}
                  >
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!visitors.length && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-32 text-center text-muted-foreground"
              >
                No visitors match these filters. Try a broader search or reset
                the filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
