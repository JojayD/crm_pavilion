export type AnnouncementChannel = "email" | "sms" | "push";
export type AnnouncementStatus = "draft" | "sent";

export type Announcement = {
  id: string;
  userId: string;
  title: string;
  channel: AnnouncementChannel;
  content: string;
  status: AnnouncementStatus;
  sentAt: string | null;
  createdAt: string;
};

export type AnnouncementRecipient = {
  id: string;
  announcementId: string;
  contactId: string;
  status: "pending" | "sent" | "failed";
  sentAt: string | null;
  viewedAt: string | null;
  error: string | null;
  createdAt: string;
};

export type CreateAnnouncementInput = {
  title: string;
  channel: AnnouncementChannel;
  content: string;
};

/** Audience filters passed to the send endpoint. */
export type SendAnnouncementInput = {
  /** All Contacts audience — send with no filters (undefined body). */
  contactIds?: string[];
  excludeContactIds?: string[];
  /** Filtered Segments audience — use these to narrow recipients. */
  company?: string;
  tag?: string;
  status?: "active" | "inactive";
};