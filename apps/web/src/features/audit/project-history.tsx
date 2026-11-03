import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loading, ErrorBox } from "@/components/common";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ProjectActivity } from "./activity";

export function ProjectHistory() {
  const [selected, setSelected] = useState("");
  const projects = useQuery({
    queryKey: ["audit-projects"],
    queryFn: () => api<{ id: string; name: string }[]>("/audit/projects"),
  });
  if (projects.isPending) return <Loading />;
  if (projects.error) return <ErrorBox error={projects.error} />;
  if (!projects.data.length) return null;
  const projectId = projects.data.some((p) => p.id === selected)
    ? selected
    : projects.data[0].id;
  return (
    <section className="space-y-5 border-b pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Administrator history</h2>
        <Select value={projectId} onValueChange={setSelected}>
          <SelectTrigger
            aria-label="Choose project history"
            className="w-full sm:w-80"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.data.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ProjectActivity key={projectId} projectId={projectId} />
    </section>
  );
}
