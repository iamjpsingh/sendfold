import { Info } from "lucide-react";
import type { AuditEvent, AuditVisitor } from "@sendfold/shared/audit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PersonCell, LocationCell, DeviceCell } from "./table-cells";
import { Timestamp } from "./common";

export function RecordDetails({
  record,
}: {
  record: AuditEvent | AuditVisitor;
}) {
  const event = "action" in record ? record : null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Details for ${record.actorName}`}
        >
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {event ? "Event details" : "Visitor details"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? "The recorded action and request information."
              : "Latest recorded device and location for this identity."}
          </DialogDescription>
        </DialogHeader>
        <PersonCell person={record} />
        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
          <LocationCell {...record} />
          <DeviceCell userAgent={record.userAgent} />
        </div>
        <dl className="grid grid-cols-[90px_1fr] gap-x-4 gap-y-3 text-sm [&_dt]:text-muted-foreground [&_dd]:min-w-0 [&_dd]:break-words">
          {event ? (
            <>
              <dt>Action</dt>
              <dd>{event.action}</dd>
              <dt>Details</dt>
              <dd>{event.detail}</dd>
              <dt>When</dt>
              <dd>
                <Timestamp value={event.createdAt} />
              </dd>
            </>
          ) : (
            "firstSeen" in record && (
              <>
                <dt>First seen</dt>
                <dd>
                  <Timestamp value={record.firstSeen} />
                </dd>
                <dt>Last seen</dt>
                <dd>
                  <Timestamp value={record.lastSeen} />
                </dd>
                <dt>Events</dt>
                <dd>{record.eventCount}</dd>
              </>
            )
          )}
          <dt>Share link</dt>
          <dd>{record.shareLabel || "Not applicable"}</dd>
          <dt>IP address</dt>
          <dd className="font-mono text-xs">
            {record.ipAddress || "Not recorded"}
          </dd>
          <dt>User agent</dt>
          <dd className="text-xs leading-5">
            {record.userAgent || "Not recorded"}
          </dd>
          {event && (
            <>
              <dt>Record ID</dt>
              <dd className="font-mono text-xs">{event.id}</dd>
              <dt>Resource ID</dt>
              <dd className="font-mono text-xs">
                {event.resourceId || "Not applicable"}
              </dd>
            </>
          )}
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">
          Guest names and emails are self-reported. Device labels are inferred
          from the reported browser; location reflects the network connection.
        </p>
      </DialogContent>
    </Dialog>
  );
}
