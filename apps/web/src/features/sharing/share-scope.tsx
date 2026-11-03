import type { ProjectFile } from "@sendfold/shared/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
export function ShareScope({
  files,
  fileId,
  setFileId,
  viewMode,
  setViewMode,
}: {
  files: ProjectFile[];
  fileId: string;
  setFileId: (id: string) => void;
  viewMode: "compact" | "full";
  setViewMode: (value: "compact" | "full") => void;
}) {
  const file = files.find((f) => f.id === fileId);
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-2">
        <Label htmlFor="share-scope">What to share</Label>
        <Select value={fileId} onValueChange={setFileId}>
          <SelectTrigger id="share-scope" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project">Entire project</SelectItem>
            {files.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.path}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {fileId === "project"
            ? "Includes all files, questions, feedback, links and tasks."
            : "Only this file and its feedback. Other project content stays private."}
        </p>
      </div>
      {fileId !== "project" && (
        <div className="space-y-2">
          <Label htmlFor="share-view">Open in</Label>
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "compact" | "full")}
          >
            <SelectTrigger id="share-view" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">
                Compact preview with feedback
              </SelectItem>
              <SelectItem value="full">Full view</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Recipients can switch views and open a full preview in a new tab.
          </p>
        </div>
      )}
      {/\.html?$/i.test(file?.name ?? "") && (
        <p className="text-xs text-muted-foreground">
          If this HTML uses separate images or stylesheets, share the entire
          project to include them.
        </p>
      )}
    </div>
  );
}
