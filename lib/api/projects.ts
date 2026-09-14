import { apiFetch } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";

export const projectsApi = {
  list: () => apiFetch<Project[]>("/projects"),
  get: (projectId: string) => apiFetch<Project>(`/projects/${projectId}`),
};
