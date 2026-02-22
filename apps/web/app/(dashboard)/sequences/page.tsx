import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SequencesList } from "@/components/sequences/sequences-list";

export default function SequencesPage() {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Sequences" />
      <main className="p-6">
        <SequencesList />
      </main>
    </div>
  );
}
