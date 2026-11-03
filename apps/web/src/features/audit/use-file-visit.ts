import { useEffect } from "react";
import { post, shareQuery } from "@/lib/api";
export function useFileVisit(fileId: string, token?: string, full = false) {
  useEffect(() => {
    // Access is checked by the server; a tracking failure must not break the preview.
    void post(`/files/${fileId}/visit${shareQuery(token)}`, {
      mode: full ? "full" : "compact",
    }).catch(() => undefined);
  }, [fileId, token, full]);
}
