"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@crm/shared";
import { Announcement, CreateAnnouncementInput, SendAnnouncementInput, AnnouncementRecipient} from "@crm/shared";



// Hooks
/** Fetch all announcements for the current user. */
export function useAnnouncements() {
  // TODO: Connect to GET /api/v1/announcements
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () =>
      apiClient<ApiResponse<Announcement[]>>("GET", "/announcements"),
    select: (res) => res.data,
  });
}

/** Fetch a single announcement by id. */
export function useAnnouncement(id: string) {
  // TODO: Connect to GET /api/v1/announcements/:id
  return useQuery({
    queryKey: ["announcements", id],
    queryFn: () =>
      apiClient<ApiResponse<Announcement>>("GET", `/announcements/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

/** Create a new announcement (draft). */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  // TODO: Connect to POST /api/v1/announcements
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      apiClient<ApiResponse<Announcement>>("POST", "/announcements", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Send a draft announcement to recipients. */
export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  // TODO: Connect to POST /api/v1/announcements/:id/send
  return useMutation({
    mutationFn: ({
      id,
      filters,
    }: {
      id: string;
      filters: SendAnnouncementInput;
    }) =>
      apiClient<ApiResponse<{ announcement: Announcement; recipientCount: number }>>(
        "POST",
        `/announcements/${id}/send`,
        filters
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      const count = res.data?.recipientCount ?? 0;
      toast.success(
        count > 0
          ? `Announcement sent to ${count} recipient${count === 1 ? "" : "s"}`
          : "Announcement sent"
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Delete an announcement. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  // TODO: Connect to DELETE /api/v1/announcements/:id
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<ApiResponse<null>>("DELETE", `/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Fetch recipients + delivery status for an announcement. */
export function useAnnouncementRecipients(id: string) {
  // TODO: Connect to GET /api/v1/announcements/:id/recipients
  return useQuery({
    queryKey: ["announcements", id, "recipients"],
    queryFn: () =>
      apiClient<ApiResponse<AnnouncementRecipient[]>>(
        "GET",
        `/announcements/${id}/recipients`
      ),
    select: (res) => res.data,
    enabled: !!id,
  });
}

