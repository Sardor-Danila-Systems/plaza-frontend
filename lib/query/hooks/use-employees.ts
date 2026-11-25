import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api/employees";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useEmployees() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.employees(projectId!),
    queryFn: () => employeesApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useOpenAdvances(employeeId: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.openAdvances(projectId!, employeeId),
    queryFn: () => employeesApi.openAdvances(projectId!, employeeId),
    enabled: !!projectId && !!employeeId,
  });
}

export function useEmployeeLedger(employeeId: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.employeeLedger(projectId!, employeeId),
    queryFn: () => employeesApi.ledger(projectId!, employeeId),
    enabled: !!projectId && !!employeeId,
  });
}

export function useCreateEmployee() {
  const { projectId } = useProject();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => employeesApi.create(projectId!, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", projectId] }),
  });
}

export function useUpdateEmployee() {
  const { projectId } = useProject();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; isActive?: boolean }) =>
      employeesApi.update(projectId!, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", projectId] }),
  });
}
