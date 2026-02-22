"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Send, FileText } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { type Announcement } from "@crm/shared";
import {
  useAnnouncements,
  useDeleteAnnouncement,
} from "@/lib/hooks/use-announcements";

// ---------------------------------------------------------------------------
// Channel badge
// ---------------------------------------------------------------------------

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
};

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <Badge variant="outline" className="text-xs capitalize">
      {CHANNEL_LABELS[channel] ?? channel}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

type RowProps = { announcement: Announcement };

function AnnouncementRow({ announcement }: RowProps) {
  const deleteAnnouncement = useDeleteAnnouncement();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sentDate = announcement.sentAt
    ? new Date(announcement.sentAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <>
      <TableRow>
        {/* Title */}
        <TableCell className="font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {announcement.status === "sent" ? (
              <Send className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            )}
            {announcement.title}
          </div>
        </TableCell>

        {/* Channel */}
        <TableCell>
          <ChannelBadge channel={announcement.channel} />
        </TableCell>

        {/* Status */}
        <TableCell>
          <StatusBadge status={announcement.status} />
        </TableCell>

        {/* Sent date */}
        <TableCell className="text-gray-500 text-sm">{sentDate}</TableCell>

        {/* Actions */}
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* TODO: Add "View Recipients" action that opens a dialog/sheet
                       showing useAnnouncementRecipients(announcement.id) data.
                       Each row: contact name, delivery status, sent/viewed timestamps. */}
              <DropdownMenuItem className="text-blue-600 focus:text-blue-600">
                View Recipients
              </DropdownMenuItem>
              {announcement.status === "draft" && (
                /* TODO: Wire up a "Resend / Send now" action for draft announcements */
                <DropdownMenuItem className="text-gray-700">
                  Send Now
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setConfirmOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{announcement.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement and all recipient
              records will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteAnnouncement.isPending}
              onClick={() => deleteAnnouncement.mutateAsync(announcement.id)}
            >
              {deleteAnnouncement.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function AnnouncementsHistory() {
  // TODO: useAnnouncements() will call GET /api/v1/announcements once the
  //       backend auth + token forwarding is confirmed working end-to-end.
  const { data: announcements, isLoading, isError, error } = useAnnouncements();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading announcements…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-red-500">
        {(error as Error)?.message ?? "Failed to load announcements"}
      </div>
    );
  }

  if (!announcements?.length) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        No announcements yet. Send your first one above.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-gray-700">Title</TableHead>
            <TableHead className="font-semibold text-gray-700">Channel</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
            <TableHead className="font-semibold text-gray-700">Sent</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((a) => (
            <AnnouncementRow key={a.id} announcement={a} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
