"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { NewAnnouncementForm } from "@/components/announcements/new-announcement-form";
import { AnnouncementsHistory } from "@/components/announcements/announcements-history";

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Announcements" />

      <main className="p-6 space-y-6">
        {/* Compose a new announcement */}
        <NewAnnouncementForm />

        {/* Past announcements */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            History
          </h2>
          <AnnouncementsHistory />
        </section>
      </main>
    </div>
  );
}
