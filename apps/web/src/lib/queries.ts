import { useQuery } from "@tanstack/react-query";
import { api, shareQuery } from "./api";
import type {
  SessionUser,
  Installation,
  Project,
  ProjectDetail,
} from "@sendfold/shared/types";
export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: () =>
      api<{ user: SessionUser; installation: Installation | null }>("/me"),
    retry: false,
    staleTime: 30_000,
  });
export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/projects"),
  });
export const useProject = (id: string, token?: string) =>
  useQuery({
    queryKey: ["project", id, token],
    queryFn: () => api<ProjectDetail>(`/projects/${id}${shareQuery(token)}`),
    refetchInterval: 20_000,
    retry: false,
  });
