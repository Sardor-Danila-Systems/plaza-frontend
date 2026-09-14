"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { qk, PROJECT_SCOPED_NAMESPACES } from "@/lib/query/keys";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Project } from "@/lib/api/types";

const STORAGE_KEY = "plaza:selectedProjectId";

interface ProjectContextValue {
  projectId: string | null;
  project: Project | null;
  projects: Project[];
  isLoading: boolean;
  canSwitch: boolean;
  setProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Only ever set by the user's own explicit switch (see setProjectId below).
  // The active projectId itself is DERIVED below, not mirrored via an effect.
  const [explicitProjectId, setExplicitProjectId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: qk.projects.list(),
    queryFn: projectsApi.list,
    enabled: !!user,
  });

  const projectId = useMemo(() => {
    if (!user || projects.length === 0) return null;

    if (explicitProjectId && projects.some((p) => p.id === explicitProjectId)) {
      return explicitProjectId;
    }
    if (user.role === "PROJECT_MANAGER" && user.projectId) {
      return user.projectId;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && projects.some((p) => p.id === stored)) return stored;
    return projects[0]?.id ?? null;
  }, [user, projects, explicitProjectId]);

  const setProjectId = useCallback(
    (id: string) => {
      // Never let a stale cross-project value paint while switching —
      // drop every project-scoped cache entry outright rather than merely
      // invalidating (invalidate still returns the old data until refetch
      // resolves).
      for (const namespace of PROJECT_SCOPED_NAMESPACES) {
        queryClient.removeQueries({ queryKey: [namespace] });
      }
      setExplicitProjectId(id);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
    },
    [queryClient],
  );

  const project = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [
    projects,
    projectId,
  ]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projectId,
      project,
      projects,
      isLoading,
      canSwitch: user?.role !== "PROJECT_MANAGER",
      setProjectId,
    }),
    [projectId, project, projects, isLoading, user, setProjectId],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
