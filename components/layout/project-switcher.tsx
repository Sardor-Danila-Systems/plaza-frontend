"use client";

import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useProject } from "@/lib/project/project-context";

export function ProjectSwitcher() {
  const { project, projects, canSwitch, setProjectId, isLoading } = useProject();

  if (isLoading) {
    return <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />;
  }

  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="truncate max-w-40">{project?.name ?? "—"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between gap-2 px-3">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="truncate max-w-36">{project?.name ?? "Выберите проект"}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => setProjectId(p.id)}>
            <span className="flex-1 truncate">{p.name}</span>
            {p.id === project?.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
