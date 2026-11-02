import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, post, shareQuery } from "@/lib/api";
export function useFileLease(fileId: string, version: number, token?: string) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false);
  const path = `/files/${fileId}/lease${shareQuery(token)}`;
  async function start() {
    setBusy(true);
    try {
      const result = await post<{ version: number }>(path, {});
      if (result.version !== version) {
        await api(path, { method: "DELETE" });
        throw new Error(
          "A newer revision is available. Close and reopen this file.",
        );
      }
      setEditing(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    setEditing(false);
    try {
      await api(path, { method: "DELETE" });
    } catch {
      /* Expired leases are reclaimed automatically. */
    }
  }
  useEffect(() => {
    if (!editing) return;
    const timer = setInterval(() => {
      post(path, {}).catch((e) => {
        setEditing(false);
        toast.error((e as Error).message);
      });
    }, 30_000);
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", before);
      void api(path, { method: "DELETE" }).catch(() => {});
    };
  }, [editing, path]);
  return { editing, busy, start, stop };
}
