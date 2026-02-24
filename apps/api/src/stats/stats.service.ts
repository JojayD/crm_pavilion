import { Inject, Injectable } from '@nestjs/common';
import { sql, eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getDashboardStats(userId: string) {
    const [{ contactCount }] = await this.db
      .select({ contactCount: sql<number>`count(*)` })
      .from(schema.contacts)
      .where(eq(schema.contacts.userId, userId));

    const [{ messagesSent }] = await this.db
      .select({ messagesSent: sql<number>`count(*)` })
      .from(schema.announcementRecipients)
      .innerJoin(
        schema.announcements,
        eq(schema.announcementRecipients.announcementId, schema.announcements.id),
      )
      .where(
        and(
          eq(schema.announcements.userId, userId),
          eq(schema.announcementRecipients.status, 'sent'),
        ),
      );

    return {
      contactCount: Number(contactCount),
      messagesSent: Number(messagesSent),
    };
  }
}
