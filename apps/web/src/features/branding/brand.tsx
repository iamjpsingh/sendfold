import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, ArrowUpRight } from "lucide-react";
import { defaultBranding, type Branding } from "@sendfold/shared/branding";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function useBranding() {
  const query = useQuery({
    queryKey: ["branding"],
    queryFn: () => api<Branding>("/branding"),
    staleTime: 60_000,
  });
  return { ...query, branding: query.data ?? defaultBranding };
}
export function Brand({
  small = false,
  preview,
}: {
  small?: boolean;
  preview?: Branding;
}) {
  const { branding } = useBranding(),
    value = preview ?? branding;
  return (
    <div className="flex min-w-0 items-center gap-2.5" translate="no">
      {value.logoId ? (
        <img
          src={`/api/branding/logo/${value.logoId}`}
          alt={small ? value.name : ""}
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-lg object-contain"
        />
      ) : (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-label={small ? value.name : undefined}
        >
          <Layers className="size-5" aria-hidden="true" />
        </span>
      )}
      {!small && (
        <span className="truncate text-lg font-semibold tracking-tight">
          {value.name}
        </span>
      )}
    </div>
  );
}
export function BrandMetadata() {
  const { branding } = useBranding();
  useEffect(() => {
    document.title = branding.tagline
      ? `${branding.name} — ${branding.tagline}`
      : branding.name;
  }, [branding.name, branding.tagline]);
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>("#sendfold-favicon");
    if (!icon) return;
    if (branding.logoId) icon.removeAttribute("type");
    else icon.type = "image/svg+xml";
    icon.href = branding.logoId
      ? `/api/branding/logo/${branding.logoId}`
      : "/favicon.svg";
  }, [branding.logoId]);
  return null;
}
export function BrandFooter({ preview }: { preview?: Branding }) {
  const { branding } = useBranding(),
    value = preview ?? branding;
  return (
    <footer className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground md:px-8">
      <span className="break-words">
        {value.name}
        {value.tagline ? ` · ${value.tagline}` : ""}
      </span>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-auto gap-1.5 px-2 py-1 text-xs text-muted-foreground"
      >
        {value.poweredByEnabled ? (
          value.poweredByUrl ? (
            <a
              href={value.poweredByUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered by {value.poweredByName}
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          ) : (
            <span>Powered by {value.poweredByName}</span>
          )
        ) : (
          <a
            href="https://github.com/iamjpsingh/sendfold"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        )}
      </Button>
    </footer>
  );
}
