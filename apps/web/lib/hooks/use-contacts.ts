"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Contact } from "@crm/shared";
import { ApiResponse } from "@crm/shared";

export type CreateContactInput = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
};

export type UpdateContactInput = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  status?: "active" | "inactive";
};

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiClient<ApiResponse<Contact[]>>("GET", "/contacts"),
    select: (res) => res.data,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      apiClient<ApiResponse<Contact>>("POST", "/contacts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<ApiResponse<null>>("DELETE", `/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useEditContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactInput }) =>
      apiClient<ApiResponse<Contact>>("PATCH", `/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}