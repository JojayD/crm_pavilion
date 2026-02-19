import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';

export interface SendAnnouncementJobData {
  recipientId: string;
  announcementId: string;
}

@Processor('announcement-send')
export class AnnouncementsProcessor extends WorkerHost {
  constructor(@Inject(DRIZZLE) private readonly db: any) {
    super()
  }

  async process(job: Job<SendAnnouncementJobData>): Promise<void> {
    const { recipientId } = job.data;

    try {
      // TODO: plug in real delivery here (email via Resend, SMS via Twilio, etc.)

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
