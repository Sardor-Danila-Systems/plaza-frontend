import { apiFetch } from "@/lib/api/client";
import type { Employee, EmployeeLedger, OpenAdvance } from "@/lib/api/types";

export const employeesApi = {
  list: (projectId: string) => apiFetch<Employee[]>(`/projects/${projectId}/employees`),
  create: (projectId: string, name: string) =>
    apiFetch<Employee>(`/projects/${projectId}/employees`, { method: "POST", body: { name } }),
  update: (projectId: string, id: string, body: { name?: string; isActive?: boolean }) =>
    apiFetch<Employee>(`/projects/${projectId}/employees/${id}`, { method: "PATCH", body }),
  openAdvances: (projectId: string, id: string) =>
    apiFetch<OpenAdvance[]>(`/projects/${projectId}/employees/${id}/open-advances`),
  ledger: (projectId: string, id: string) =>
    apiFetch<EmployeeLedger>(`/projects/${projectId}/employees/${id}/ledger`),
};
