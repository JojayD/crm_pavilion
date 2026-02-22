import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { ResendService } from 'nestjs-resend';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';

export interface SendAnnouncementJobData {
  recipientId: string;
  announcementId: string;
}

@Processor('announcement-send')
export class AnnouncementsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnnouncementsProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly resendService: ResendService,
  ) {
    super();
  }

  async process(job: Job<SendAnnouncementJobData>): Promise<void> {
    const { recipientId, announcementId } = job.data;

    try {
      // 1. Fetch recipient to get contactId
      const [recipient] = await this.db
        .select()
        .from(schema.announcementRecipients)
        .where(eq(schema.announcementRecipients.id, recipientId));

      if (!recipient) throw new Error(`Recipient ${recipientId} not found`);

      // 2. Fetch announcement
      const [announcement] = await this.db
        .select()
        .from(schema.announcements)
        .where(eq(schema.announcements.id, announcementId));

      if (!announcement) throw new Error(`Announcement ${announcementId} not found`);

      // 3. Fetch contact
      const [contact] = await this.db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, recipient.contactId));

      if (!contact) throw new Error(`Contact ${recipient.contactId} not found`);

      // 4. Deliver based on channel
      if (announcement.channel === 'email') {
        if (!contact.email) {
          throw new Error('Contact has no email address');
        }
        await this.resendService.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com',
          to: contact.email,
          subject: announcement.title,
          text: announcement.content,
        });
      } else {
        // SMS / push — stub until providers are added
        this.logger.warn(
          `Channel "${announcement.channel}" not implemented — marking recipient ${recipientId} as sent (stub)`,
        );
      }

      // 5. Mark sent
      await this.db
        .update(schema.announcementRecipients)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(schema.announcementRecipients.id, recipientId));
    } catch (err: any) {
      await this.db
        .update(schema.announcementRecipients)
        .set({ status: 'failed', error: err?.message ?? 'Unknown error' })
        .where(eq(schema.announcementRecipients.id, recipientId));

      throw err; // re-throw so BullMQ retries the job
    }
  }
}
