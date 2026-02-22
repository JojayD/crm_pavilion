"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { CreateContactDialog } from "@/components/contacts/create-contact-dialog";

export default function ContactsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <DashboardHeader title="Contacts">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Contact
        </Button>
      </DashboardHeader>

      <main className="p-6">
        <ContactsTable />
      </main>

      <CreateContactDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
