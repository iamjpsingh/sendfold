import { useFileVisit } from "../audit/use-file-visit";
import { lazy, Suspense } from "react";
import { FileQuestion } from "lucide-react";
import type { ProjectFile } from "@sendfold/shared/types";
import { Loading } from "@/components/common";
const DocumentViewer = lazy(() => import("./document-viewer"));
const SheetViewer = lazy(() => import("../sheets/sheet-viewer"));
const formats = new Set([
  "html",
  "htm",
  "pdf",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "avif",
  "txt",
  "md",
  "csv",
  "json",
  "css",
  "js",
  "xml",
  "yaml",
  "yml",
  "log",
]);
export function FileRenderer({
  file,
  files,
  token,
  canEdit,
  onChange,
  full = false,
}: {
  file: ProjectFile;
  files: ProjectFile[];
  token?: string;
  canEdit: boolean;
  onChange: () => void;
  full?: boolean;
}) {
  useFileVisit(file.id, token, full);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    <Suspense fallback={<Loading />}>
      {ext === "xlsx" ? (
        <SheetViewer
          key={file.id}
          file={file}
          token={token}
          canEdit={canEdit}
          onChange={onChange}
          full={full}
        />
      ) : formats.has(ext) ? (
        <DocumentViewer
          key={`${file.id}-${file.version}`}
          file={file}
          files={files}
          token={token}
          full={full}
        />
      ) : (
        <div className="px-8 py-24 text-center">
          <FileQuestion className="mx-auto mb-4 size-10 text-muted-foreground" />
          <p className="font-medium">This file is safely stored.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            An in-browser preview is not available for this format.
          </p>
        </div>
      )}
    </Suspense>
  );
}
