"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Sequence, SequenceStep, SequenceChannel } from "@crm/shared";
import { ApiResponse } from "@crm/shared";

export type CreateSequenceInput = {
  name: string;
};

export type UpdateSequenceInput = {
  name?: string;
  status?: "draft" | "active" | "paused";
};

export type AddStepInput = {
  dayOffset: number;
  stepOrder: number;
  channel: SequenceChannel;
  content: string;
  sendHour?: number;
};

export function useSequences() {
  return useQuery({
    queryKey: ["sequences"],
    queryFn: () => apiClient<ApiResponse<Sequence[]>>("GET", "/sequences"),
    select: (res) => res.data,
  });
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: ["sequences", id],
    queryFn: () => apiClient<ApiResponse<Sequence>>("GET", `/sequences/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSequenceInput) =>
      apiClient<ApiResponse<Sequence>>("POST", "/sequences", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSequenceInput }) =>
      apiClient<ApiResponse<Sequence>>("PATCH", `/sequences/${id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      queryClient.invalidateQueries({ queryKey: ["sequences", res.data.id] });
      toast.success("Sequence updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<ApiResponse<null>>("DELETE", `/sequences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSequenceSteps(sequenceId: string) {
  return useQuery({
    queryKey: ["sequences", sequenceId, "steps"],
    queryFn: () =>
      apiClient<ApiResponse<SequenceStep[]>>(
        "GET",
        `/sequences/${sequenceId}/steps`
      ),
    select: (res) => res.data,
    enabled: !!sequenceId,
  });
}

export function useAddStep(sequenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddStepInput) =>
      apiClient<ApiResponse<SequenceStep>>(
        "POST",
        `/sequences/${sequenceId}/steps`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sequences", sequenceId, "steps"],
      });
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Step added");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteStep(sequenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) =>
      apiClient<ApiResponse<null>>(
        "DELETE",
        `/sequences/${sequenceId}/steps/${stepId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sequences", sequenceId, "steps"],
      });
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Step removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
