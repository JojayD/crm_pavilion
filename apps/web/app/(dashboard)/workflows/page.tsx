import { DashboardHeader } from "@/components/layout/dashboard-header";
import { WorkflowsList } from "@/components/workflows/workflows-list";

export default function WorkflowsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Workflows" />
      <main className="p-6">
        <WorkflowsList />
      </main>
    </div>
  );
}
