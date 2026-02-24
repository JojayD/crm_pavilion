"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ApiResponse, DashboardStats } from "@crm/shared";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => apiClient<ApiResponse<DashboardStats>>("GET", "/stats"),
    select: (res) => res.data,
  });
}
