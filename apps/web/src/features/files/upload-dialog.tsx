import { useRef, useState } from "react";
import { Upload, FolderUp, FilePlus2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { uploadFile, formatBytes } from "@/lib/api";
import { droppedFiles, type PickedFile } from "./drop-files";
import { Busy, FileIcon } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
export function UploadDialog({
  projectId,
  token,
  onChange,
}: {
  projectId: string;
  token?: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<PickedFile[]>([]),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(0),
    [drag, setDrag] = useState(false);
  const files = useRef<HTMLInputElement>(null),
    folder = useRef<HTMLInputElement>(null);
  function add(incoming: PickedFile[]) {
    setItems((current) => {
      const paths = new Set(current.map((f) => f.path));
      const valid = incoming.filter(
        (f) => !paths.has(f.path) && f.file.size <= 25 * 1024 * 1024,
      );
      if (valid.length !== incoming.length)
        toast.info("Duplicate paths and files larger than 25 MB were skipped.");
      if (current.length + valid.length > 500) {
        toast.error("Upload up to 500 files at a time.");
        return current;
      }
      return [...current, ...valid];
    });
  }
  async function upload() {
    setBusy(true);
    setDone(0);
    const failed: PickedFile[] = [];
    let count = 0;
    for (const item of items) {
      try {
        await uploadFile(projectId, item.file, item.path, token);
        count++;
        setDone(count);
      } catch (e) {
        failed.push(item);
        toast.error(`${item.path}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    setItems(failed);
    onChange();
    if (!failed.length) {
      setOpen(false);
      toast.success(`${count} file${count === 1 ? "" : "s"} uploaded`);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          Upload files
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bring your work together</DialogTitle>
          <DialogDescription>
            Drop files or an entire folder. Folder paths are preserved. Up to 25
            MB per file.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={files}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            add(
              Array.from(e.target.files ?? []).map((file) => ({
                file,
                path: file.name,
              })),
            );
            e.target.value = "";
          }}
        />
        <input
          ref={folder}
          type="file"
          multiple
          hidden
          {...{ webkitdirectory: "" }}
          onChange={(e) => {
            add(
              Array.from(e.target.files ?? []).map((file) => ({
                file,
                path: file.webkitRelativePath || file.name,
              })),
            );
            e.target.value = "";
          }}
        />
        <div
          className={`rounded-lg border-2 border-dashed p-9 text-center ${drag ? "border-foreground bg-muted" : "border-border"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDrag(false);
            if (!busy) {
              try {
                add(await droppedFiles(e.dataTransfer));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }
          }}
        >
          <Upload className="mx-auto mb-4 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop a folder, or a little of everything
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            HTML · PDF · Excel · Word · images · and more
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => files.current?.click()}
            >
              <FilePlus2 className="size-4" />
              Choose files
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => folder.current?.click()}
            >
              <FolderUp className="size-4" />
              Choose folder
            </Button>
          </div>
        </div>
        {items.length > 0 && (
          <div className="max-h-52 overflow-y-auto rounded-md border">
            {items.map((item, i) => (
              <div
                key={item.path}
                className="flex items-center gap-3 border-b px-3 py-2 last:border-0"
              >
                <FileIcon name={item.path} />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {item.path}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(item.file.size)}
                </span>
                <Button
                  disabled={busy}
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${item.path}`}
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {busy && (
          <div className="space-y-2">
            <Progress value={(done / items.length) * 100} />
            <p className="text-xs text-muted-foreground">
              {done} of {items.length} uploaded
            </p>
          </div>
        )}
        <Button disabled={busy || !items.length} onClick={upload}>
          <Busy busy={busy}>
            <Check className="size-4" />
            Upload {items.length || ""} files
          </Busy>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
