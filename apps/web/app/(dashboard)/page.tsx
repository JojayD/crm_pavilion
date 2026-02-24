"use client";

import { Users, Send } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useStats } from "@/lib/hooks/use-stats";

export default function DashboardPage() {
  const { data: stats } = useStats();

  const contactCount = stats?.contactCount ?? 0;
  const messagesSent = stats?.messagesSent ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Dashboard" />
      <main className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            label="Total Contacts"
            value={contactCount.toLocaleString()}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <MetricCard
            label="Messages Sent"
            value={messagesSent.toLocaleString()}
            icon={Send}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
          />
        </div>
      </main>
    </div>
  );
}
