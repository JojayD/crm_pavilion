"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@crm/shared";
import {
  Workflow,
  WorkflowAction,
  WorkflowCondition,
  WorkflowExecution,
  TriggerType,
  ActionType,
  WorkflowStatus,
} from "@crm/shared";

export type CreateWorkflowInput = {
  name: string;
  triggerType: TriggerType;
  triggerConfig?: Record<string, any>;
  conditions?: WorkflowCondition[];
};

export type UpdateWorkflowInput = {
  name?: string;
  status?: WorkflowStatus;
  triggerConfig?: Record<string, any>;
  conditions?: WorkflowCondition[];
};

export type AddActionInput = {
  actionType: ActionType;
  actionConfig?: Record<string, any>;
  executionOrder?: number;
};

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => apiClient<ApiResponse<Workflow[]>>("GET", "/workflows"),
    select: (res) => res.data,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => apiClient<ApiResponse<Workflow>>("GET", `/workflows/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowInput) =>
      apiClient<ApiResponse<Workflow>>("POST", "/workflows", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowInput }) =>
      apiClient<ApiResponse<Workflow>>("PATCH", `/workflows/${id}`, data),
    onSuccess: (res) => {
      queryClient.setQueryData(["workflows", res.data.id], res);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<ApiResponse<null>>("DELETE", `/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useAddAction(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddActionInput) =>
      apiClient<ApiResponse<WorkflowAction>>(
        "POST",
        `/workflows/${workflowId}/actions`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workflowId] });
      toast.success("Action added");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveAction(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) =>
      apiClient<ApiResponse<null>>(
        "DELETE",
        `/workflows/${workflowId}/actions/${actionId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workflowId] });
      toast.success("Action removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useWorkflowExecutions(workflowId: string) {
  return useQuery({
    queryKey: ["workflows", workflowId, "executions"],
    queryFn: () =>
      apiClient<ApiResponse<WorkflowExecution[]>>(
        "GET",
        `/workflows/${workflowId}/executions`
      ),
    select: (res) => res.data,
    enabled: !!workflowId,
  });
}
