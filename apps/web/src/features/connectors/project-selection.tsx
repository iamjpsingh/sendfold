import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ErrorBox, Loading } from "@/components/common";
import { useProjects } from "@/lib/queries";

export function ProjectSelection({
  selected,
  onChange,
  allowWrite,
  onWrite,
  canWrite = true,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  allowWrite: boolean;
  onWrite: (value: boolean) => void;
  canWrite?: boolean;
}) {
  const projects = useProjects();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Approved projects</p>
        <p className="text-xs text-muted-foreground">
          Only selected projects are shared. Your current project role always
          applies.
        </p>
        {projects.isPending && <Loading />}
        {projects.error && <ErrorBox error={projects.error} />}
        {projects.data?.length === 0 && (
          <p className="rounded-lg border bg-muted/30 p-4 text-sm">
            Create a project or ask an admin to add you to one first.
          </p>
        )}
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {projects.data?.map((project) => (
            <Label
              key={project.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
            >
              <Checkbox
                checked={selected.includes(project.id)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, project.id]
                      : selected.filter((id) => id !== project.id),
                  )
                }
              />
              <span>
                {project.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {project.client}
                </span>
              </span>
            </Label>
          ))}
        </div>
      </div>
      {canWrite && (
        <Label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-primary/5 p-4">
          <Checkbox
            checked={allowWrite}
            onCheckedChange={(checked) => onWrite(checked === true)}
          />
          <span className="space-y-1">
            <span className="block">Allow edits</span>
            <span className="block text-xs font-normal leading-5 text-muted-foreground">
              Create and revise text files, add feedback and questions. Locked
              projects and viewer roles still prevent changes.
            </span>
          </span>
        </Label>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Files, questions and feedback from these projects may be read by the AI
        app. Connections cannot manage people, client passwords or installation
        settings.
      </p>
    </div>
  );
}
