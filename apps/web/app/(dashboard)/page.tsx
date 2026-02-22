import { Users, Send, Zap } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Dashboard" />
      <main className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Total Contacts"
            value="2,840"
            change="+12%"
            positive
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <MetricCard
            label="Msg Sent (Mo)"
            value="14.2k"
            change="+8%"
            positive
            icon={Send}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
          />
          <MetricCard
            label="Automation ROI"
            value="24%"
            change="+5%"
            positive
            icon={Zap}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
          />
        </div>
      </main>
    </div>
  );
}
