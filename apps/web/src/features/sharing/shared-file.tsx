import { useState } from "react";
import type { SharedSession } from "@sendfold/shared/types";
import { useProject } from "@/lib/queries";
import { Loading, ErrorBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FilePreview } from "../files/file-preview";
import { useEditorState } from "../files/editor-state";
export function SharedFile({
  session,
  token,
}: {
  session: SharedSession;
  token: string;
}) {
  const detail = useProject(session.projectId, token),
    [full, setFull] = useState(session.viewMode === "full"),
    { editing } = useEditorState();
  if (detail.isPending) return <Loading />;
  if (detail.error)
    return (
      <div className="p-6">
        <ErrorBox error={detail.error} />
      </div>
    );
  const file = detail.data.files.find((f) => f.id === session.fileId);
  if (!file)
    return <div className="p-6">This file is no longer available.</div>;
  return (
    <main className={full ? "p-3 md:p-5" : "mx-auto max-w-6xl p-5 md:p-8"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">{file.name}</h1>
        <Button
          variant="secondary"
          size="sm"
          disabled={editing}
          onClick={() => setFull((v) => !v)}
        >
          {full ? "Compact view" : "Full view"}
        </Button>
      </div>
      <FilePreview
        file={file}
        detail={detail.data}
        token={token}
        full={full}
        onChange={() => void detail.refetch()}
      />
    </main>
  );
}
