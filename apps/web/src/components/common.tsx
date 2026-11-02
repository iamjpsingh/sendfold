import {
  File,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image,
  Layers,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Layers className="size-5" />
      </span>
      {!small && (
        <span className="text-lg font-semibold tracking-tight">
          Sendfold<span className="text-muted-foreground">.</span>
        </span>
      )}
    </div>
  );
}
export function FileIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const ext = name.split(".").pop()?.toLowerCase();
  const Icon = ["xlsx", "csv", "xls"].includes(ext ?? "")
    ? FileSpreadsheet
    : ["html", "css", "js", "json"].includes(ext ?? "")
      ? FileCode
      : ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext ?? "")
        ? Image
        : ["pdf", "docx", "txt", "md"].includes(ext ?? "")
          ? FileText
          : File;
  return <Icon className={cn("size-5", className)} />;
}
export function Status({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className="gap-1.5 capitalize">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active"
            ? "bg-emerald-500"
            : status === "locked"
              ? "bg-amber-500"
              : "bg-muted-foreground",
        )}
      />
      {status}
    </Badge>
  );
}
export function Loading() {
  return (
    <div className="space-y-4 p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="mt-8 h-60 w-full" />
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        {error instanceof Error ? error.message : "Something went wrong."}
        {retry && (
          <Button size="sm" variant="outline" onClick={retry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function Busy({
  children,
  busy = false,
}: {
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <>
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </>
  );
}
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}
