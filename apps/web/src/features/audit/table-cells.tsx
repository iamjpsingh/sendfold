import { Monitor, Smartphone, Tablet, Tv, Globe, Compass } from "lucide-react";
import type { AuditActor, RequestInfo } from "@sendfold/shared/audit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ActorBadge } from "./common";
import { deviceInfo, locationInfo } from "./metadata";

export function PersonCell({
  person,
  onSelect,
}: {
  person: AuditActor;
  onSelect?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
          {person.actorName
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("") || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {onSelect ? (
            <Button
              variant="link"
              className="h-auto max-w-36 truncate p-0 text-sm text-foreground"
              onClick={onSelect}
              title={person.actorName}
            >
              {person.actorName}
            </Button>
          ) : (
            <span
              className="max-w-36 truncate font-medium"
              title={person.actorName}
            >
              {person.actorName}
            </span>
          )}
          <ActorBadge kind={person.actorKind} compact />
        </div>
        <p
          className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground"
          title={person.actorEmail ?? undefined}
        >
          {person.actorEmail || "Email not provided"}
        </p>
      </div>
    </div>
  );
}
export function LocationCell({
  country,
  ipAddress,
}: Pick<RequestInfo, "country" | "ipAddress">) {
  const location = locationInfo(country);
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1.5 text-xs">
        {location.flag ? (
          <span aria-hidden="true" className="text-base leading-none">
            {location.flag}
          </span>
        ) : (
          <Globe
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {location.name}
      </span>
      <p
        className="max-w-44 truncate font-mono text-[11px] text-muted-foreground"
        title={ipAddress ?? undefined}
      >
        {ipAddress || "IP not recorded"}
      </p>
    </div>
  );
}
export function DeviceCell({ userAgent }: { userAgent: string | null }) {
  const info = deviceInfo(userAgent);
  const Device =
    { desktop: Monitor, mobile: Smartphone, tablet: Tablet, tv: Tv }[
      info.device
    ] ?? Globe;
  const Browser = /safari/i.test(info.browser) ? Compass : Globe;
  return (
    <div
      className="flex items-center gap-2"
      title={`Reported device: ${info.device}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
        <Device className="size-4" aria-label={`${info.device} device`} />
      </span>
      <div className="space-y-1">
        <p className="flex items-center gap-1 text-xs">
          <Browser className="size-3" aria-hidden="true" />
          {info.browser}
        </p>
        <p className="text-[11px] text-muted-foreground">{info.os}</p>
      </div>
    </div>
  );
}
export function TableTime({ value }: { value: number }) {
  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={new Date(value).toISOString()}
      className="block text-xs tabular-nums"
    >
      <span className="block">
        {new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
      <span className="mt-1 block text-[11px] text-muted-foreground">
        {new Date(value).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </time>
  );
}
