import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function WorkflowsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Workflows" />
      <main className="p-6">
        <p className="text-sm text-gray-500">Workflows coming soon.</p>
      </main>
    </div>
  );
}
