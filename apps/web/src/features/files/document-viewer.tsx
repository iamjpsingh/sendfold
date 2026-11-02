import { useEffect, useRef, useState } from "react";
import type { ProjectFile } from "@sendfold/shared/types";
import { contentUrl } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/common";
import { htmlPreview } from "./html-preview";
export default function DocumentViewer({
  file,
  files,
  token,
  full = false,
}: {
  file: ProjectFile;
  files: ProjectFile[];
  token?: string;
  full?: boolean;
}) {
  const [value, setValue] = useState<{
      url?: string;
      html?: string;
      text?: string;
    }>(),
    [error, setError] = useState<unknown>();
  const docx = useRef<HTMLDivElement>(null);
  const ext = file.name.split(".").pop()?.toLowerCase(),
    image = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(
      ext ?? "",
    ),
    html = ext === "html" || ext === "htm";
  useEffect(() => {
    let active = true,
      dispose = () => {};
    setValue(undefined);
    setError(undefined);
    (async () => {
      if (html) {
        const preview = await htmlPreview(file, files, token);
        dispose = preview.dispose;
        if (active) setValue({ html: preview.html });
        else dispose();
        return;
      }
      const response = await fetch(contentUrl(file.id, token));
      if (!response.ok) throw new Error("This file could not be loaded.");
      if (ext === "docx") {
        const { renderAsync } = await import("docx-preview");
        const bytes = await response.arrayBuffer();
        if (active && docx.current) {
          await renderAsync(bytes, docx.current, undefined, {
            inWrapper: true,
            breakPages: true,
            renderAltChunks: false,
          });
          setValue({});
        }
      } else if (image || ext === "pdf") {
        const blob = new Blob([await response.arrayBuffer()], {
          type:
            ext === "pdf"
              ? "application/pdf"
              : ext === "svg"
                ? "image/svg+xml"
                : `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
        const url = URL.createObjectURL(blob);
        dispose = () => URL.revokeObjectURL(url);
        if (active) setValue({ url });
        else dispose();
      } else {
        const text = (await response.text()).slice(0, 500_000);
        if (active) setValue({ text });
      }
    })().catch((e) => active && setError(e));
    return () => {
      active = false;
      dispose();
    };
  }, [file.id, file.version, token]);
  if (error)
    return (
      <div className="p-6">
        <ErrorBox error={error} />
      </div>
    );
  return (
    <div className="h-full min-h-[500px] bg-muted/20">
      {!value && <Loading />}
      {ext === "docx" ? (
        <div
          ref={docx}
          className={`${full ? "h-[calc(100dvh-57px)]" : "max-h-[70vh]"} overflow-auto [&_.docx-wrapper]:!p-4 [&_section.docx]:!max-w-full`}
        />
      ) : value?.html ? (
        <iframe
          title={file.name}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={value.html}
          className={
            full
              ? "h-[calc(100dvh-57px)] w-full border-0 bg-white"
              : "h-[70vh] w-full border-0 bg-white"
          }
        />
      ) : value?.url ? (
        image ? (
          <div className="flex min-h-[500px] items-center justify-center p-8">
            <img
              src={value.url}
              alt={file.name}
              className={`${full ? "max-h-[calc(100dvh-100px)]" : "max-h-[65vh]"} max-w-full object-contain`}
            />
          </div>
        ) : (
          <iframe
            title={file.name}
            src={value.url}
            className={
              full
                ? "h-[calc(100dvh-57px)] w-full border-0"
                : "h-[70vh] w-full border-0"
            }
          />
        )
      ) : value?.text !== undefined ? (
        <pre
          className={`${full ? "h-[calc(100dvh-57px)]" : "max-h-[70vh]"} overflow-auto whitespace-pre-wrap break-words p-6 text-xs leading-6`}
        >
          {value.text}
        </pre>
      ) : null}
    </div>
  );
}
