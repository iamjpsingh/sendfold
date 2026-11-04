import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Branding } from "@sendfold/shared/branding";
import { api, patch } from "@/lib/api";
import { Brand, BrandFooter, useBranding } from "./brand";
import { Busy, ErrorBox } from "@/components/common";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function BrandingSettings() {
  const { data, error } = useBranding();
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;
  return <BrandingForm key={JSON.stringify(data)} initial={data} />;
}
function BrandingForm({ initial }: { initial: Branding }) {
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const query = useQueryClient();
  const update = (key: keyof Branding, value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));
  async function action(run: () => Promise<Branding>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await run();
      query.setQueryData(["branding"], result);
      toast.success("Branding updated.");
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (file.size > 1024 * 1024) {
      setError(new Error("Choose a logo up to 1 MB."));
      return;
    }
    const form = new FormData();
    form.set("file", file);
    await action(async () => {
      await patch<Branding>("/branding", draft);
      return api<Branding>("/branding/logo", { method: "POST", body: form });
    });
  }
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Your name and logo appear on sign-in, projects and shared links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void action(() => patch("/branding", draft));
          }}
        >
          <fieldset disabled={busy} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Display name</Label>
                <Input
                  id="brand-name"
                  value={draft.name}
                  maxLength={60}
                  required
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-tagline">
                  Tagline{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="brand-tagline"
                  value={draft.tagline}
                  maxLength={120}
                  onChange={(e) => update("tagline", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo</Label>
              <p className="text-xs text-muted-foreground">
                Also used as the browser tab icon. A square image works best.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="brand-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="max-w-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = "";
                  }}
                />
                {draft.logoId && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      void action(async () => {
                        await patch("/branding", draft);
                        return api("/branding/logo", { method: "DELETE" });
                      })
                    }
                  >
                    Remove logo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG or WebP, up to 1 MB. Uploading saves your branding
                changes.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="powered-by">
                    Show a custom “Powered by” credit
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Off by default: the footer links to Sendfold’s open-source
                    repository.
                  </p>
                </div>
                <Switch
                  id="powered-by"
                  checked={draft.poweredByEnabled}
                  onCheckedChange={(v) => update("poweredByEnabled", v)}
                />
              </div>
              {draft.poweredByEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="powered-name">Company name</Label>
                    <Input
                      id="powered-name"
                      value={draft.poweredByName}
                      maxLength={60}
                      required
                      onChange={(e) => update("poweredByName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="powered-url">
                      Website{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="powered-url"
                      type="url"
                      placeholder="https://imapro.in"
                      value={draft.poweredByUrl}
                      onChange={(e) => update("poweredByUrl", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </fieldset>
          <div className="rounded-lg border bg-background">
            <div className="border-b p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Preview
              </p>
              <Brand preview={draft} />
            </div>
            <BrandFooter preview={draft} />
          </div>
          {error && <ErrorBox error={error} />}
          <Button disabled={busy}>
            <Busy busy={busy}>Save branding</Busy>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
