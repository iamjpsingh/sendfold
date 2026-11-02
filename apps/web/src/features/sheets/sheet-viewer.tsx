import { useEditingGuard } from "../files/editor-state";
import { useEffect, useRef, useState } from "react";
import {
  createUniver,
  LocaleType,
  type IWorkbookData,
} from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import locale from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import { Plus, Save, Pencil, Lock } from "lucide-react";
import { toast } from "sonner";
import type { ProjectFile } from "@sendfold/shared/types";
import { api, contentUrl, shareQuery } from "@/lib/api";
import { Busy, ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { importWorkbook, exportWorkbook } from "./workbook";
import { useFileLease } from "../files/use-file-lease";
export default function SheetViewer({
  file,
  token,
  canEdit,
  full = false,
  onChange,
}: {
  file: ProjectFile;
  token?: string;
  canEdit: boolean;
  full?: boolean;
  onChange: () => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    instance = useRef<ReturnType<typeof createUniver> | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState<unknown>(),
    [saving, setSaving] = useState(false),
    [revision, setRevision] = useState(file.version),
    [reload, setReload] = useState(0);
  const lease = useFileLease(file.id, revision, token);
  useEditingGuard(lease.editing);
  useEffect(() => {
    let active = true;
    setReady(false);
    (async () => {
      let data = await api<IWorkbookData | null>(
        `/files/${file.id}/workbook${shareQuery(token)}`,
      );
      if (!data) {
        const response = await fetch(contentUrl(file.id, token));
        if (!response.ok) throw new Error("Workbook could not be loaded.");
        data = await importWorkbook(await response.arrayBuffer(), file.name);
      }
      if (!active || !container.current) return;
      const current = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: locale },
        presets: [UniverSheetsCorePreset({ container: container.current })],
      });
      instance.current = current;
      current.univerAPI.createWorkbook(data).setEditable(false);
      setReady(true);
    })().catch((e) => active && setError(e));
    return () => {
      active = false;
      instance.current?.univer.dispose();
      instance.current = null;
    };
  }, [file.id, token, reload]);
  useEffect(() => {
    instance.current?.univerAPI.getActiveWorkbook()?.setEditable(lease.editing);
  }, [lease.editing, ready]);
  async function save() {
    setSaving(true);
    try {
      const snapshot = instance.current?.univerAPI.getActiveWorkbook()?.save();
      if (!snapshot) throw new Error("Workbook not ready.");
      const blob = await exportWorkbook(snapshot),
        form = new FormData();
      form.set("file", blob, file.name);
      form.set("workbook", JSON.stringify(snapshot));
      form.set("version", String(revision));
      const result = await api<{ version: number }>(
        `/files/${file.id}/revisions${shareQuery(token)}`,
        { method: "POST", body: form },
      );
      setRevision(result.version);
      await lease.stop();
      onChange();
      toast.success(`Saved version ${result.version}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          {lease.editing ? "You have the editing lock" : "View mode"} · v
          {revision}
        </span>
        <div className="flex gap-2">
          {lease.editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={async () => {
                  await lease.stop();
                  setReload((n) => n + 1);
                }}
              >
                Discard edits
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  instance.current?.univerAPI.getActiveWorkbook()?.insertSheet()
                }
                disabled={saving}
              >
                <Plus className="size-4" />
                Add tab
              </Button>
              <Button size="sm" disabled={saving} onClick={save}>
                <Busy busy={saving}>
                  <Save className="size-4" />
                  Save revision
                </Busy>
              </Button>
            </>
          ) : (
            canEdit && (
              <Button
                size="sm"
                variant="outline"
                disabled={!ready || lease.busy}
                onClick={lease.start}
              >
                <Busy busy={lease.busy}>
                  <Pencil className="size-4" />
                  Edit workbook
                </Busy>
              </Button>
            )
          )}
        </div>
      </div>
      <p className="border-b bg-muted/30 px-4 py-2 text-xs leading-5 text-muted-foreground">
        Edits support cells, basic formulas, and tabs. Advanced Excel features
        may change on export. Original uploads remain available in version
        history.
      </p>
      {!!error && (
        <div className="p-4">
          <ErrorBox error={error} />
        </div>
      )}
      <div
        ref={container}
        className={`${full ? "h-[calc(100dvh-170px)]" : "h-[65vh]"} min-h-[450px] w-full bg-white`}
      />
      {!ready && !error && (
        <p className="p-3 text-sm text-muted-foreground">
          Loading spreadsheet editor…
        </p>
      )}
    </div>
  );
}
