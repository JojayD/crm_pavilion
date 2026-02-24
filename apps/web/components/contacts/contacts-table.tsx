"use client";

import { useState } from "react";
import { MoreHorizontal, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useContacts, useDeleteContact } from "@/lib/hooks/use-contacts";
import { Contact } from "@crm/shared";
import { UpdateContactDialog } from "@/components/contacts/update-contact-dialog";

type ContactRowProps = {
  contact: Contact;
  onEdit: (contact: Contact) => void;
};

function ContactRow({ contact, onEdit }: ContactRowProps) {
  const deleteContact = useDeleteContact();

  return (
    <TableRow>
      <TableCell className="font-medium text-gray-900">{contact.name}</TableCell>
      <TableCell className="text-gray-600">{contact.email ?? "—"}</TableCell>
      <TableCell className="text-gray-600">{contact.phone ?? "—"}</TableCell>
      <TableCell className="text-gray-600">{contact.company ?? "—"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {contact.tags.length > 0
            ? contact.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))
            : <span className="text-gray-400">—</span>}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={contact.status} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-blue-600 focus:text-blue-600"
              onClick={() => onEdit(contact)}
            >
              Edit
            </DropdownMenuItem>
            <DeleteConfirmDialog
              title={`Delete ${contact.name}?`}
              description="This action cannot be undone. The contact will be permanently removed."
              onConfirm={() => deleteContact.mutateAsync(contact.id)}
              isPending={deleteContact.isPending}
            >
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(e) => e.preventDefault()}
              >
                Delete
              </DropdownMenuItem>
            </DeleteConfirmDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function ContactsTable() {
  const { data: contacts, isLoading, isError, error } = useContacts();
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading contacts…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-red-500">
        {(error as Error)?.message ?? "Failed to load contacts"}
      </div>
    );
  }

  if (!contacts?.length) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        No contacts yet. Click &ldquo;New Contact&rdquo; to add one.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto rounded-md border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700">Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Email</TableHead>
              <TableHead className="font-semibold text-gray-700">Phone</TableHead>
              <TableHead className="font-semibold text-gray-700">Company</TableHead>
              <TableHead className="font-semibold text-gray-700">Tags</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                onEdit={(c) => setEditingContact(c)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <UpdateContactDialog
        contact={editingContact}
        open={!!editingContact}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null);
        }}
      />
    </>
  );
}
