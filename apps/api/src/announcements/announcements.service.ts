import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { and, arrayContains, desc, eq, inArray } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { SendAnnouncementDto } from './dto/send-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { SendAnnouncementJobData } from './announcements.processor';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('announcement-send') private readonly sendQueue: Queue,
  ) {}

  async findAll(userId: string) {
    return this.db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.userId, userId))
      .orderBy(desc(schema.announcements.createdAt));
  }

  async create(userId: string, dto: CreateAnnouncementDto) {
    const [announcement] = await this.db
      .insert(schema.announcements)
      .values({ ...dto, userId })
      .returning();
    return announcement;
  }

  async update(userId: string, id: string, dto: UpdateAnnouncementDto) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, id), eq(schema.announcements.userId, userId)));

    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.status === 'sent') throw new BadRequestException('Cannot edit a sent announcement');

    const [updated] = await this.db
      .update(schema.announcements)
      .set(dto)
      .where(eq(schema.announcements.id, id))
      .returning();

    return updated;
  }

  async send(userId: string, id: string, filters: SendAnnouncementDto) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, id), eq(schema.announcements.userId, userId)));

    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.status === 'sent') throw new BadRequestException('Announcement has already been sent');

    // Set A — filter-based contacts (only run when needed)
    const filtersApplied = !!(filters.company || filters.tag || filters.status);
    const hasExplicitIds = !!(filters.contactIds?.length);

    let filterContacts: any[] = [];
    if (filtersApplied || !hasExplicitIds) {
      const conditions = [eq(schema.contacts.userId, userId)];
      if (filters.company) conditions.push(eq(schema.contacts.company, filters.company));
      if (filters.tag)     conditions.push(arrayContains(schema.contacts.tags, [filters.tag]));
      if (filters.status)  conditions.push(eq(schema.contacts.status, filters.status as any));
      filterContacts = await this.db.select().from(schema.contacts).where(and(...conditions));

      if (filtersApplied && filterContacts.length === 0) {
        throw new BadRequestException('No contacts matched the specified filters');
      }
    }

    // Set B — explicitly selected contacts (userId-gated)
    let explicitContacts: any[] = [];
    if (filters.contactIds && filters.contactIds.length > 0) {
      explicitContacts = await this.db
        .select()
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.userId, userId),
          inArray(schema.contacts.id, filters.contactIds),
        ));
    }

    // Union A ∪ B, deduplicated by contact ID
    const merged = new Map<string, any>();
    for (const c of filterContacts)   merged.set(c.id, c);
    for (const c of explicitContacts) merged.set(c.id, c);

    // Apply exclusions (in-memory, no extra DB query)
    const excludeSet = new Set(filters.excludeContactIds ?? []);
    const contacts = [...merged.values()].filter(c => !excludeSet.has(c.id));

    if (contacts.length === 0) {
      throw new BadRequestException('No recipients: all matched contacts were excluded');
    }

    try {
      const inserted = await this.db
        .insert(schema.announcementRecipients)
        .values(contacts.map((c: any) => ({ announcementId: id, contactId: c.id })))
        .returning({ id: schema.announcementRecipients.id });

      const [updated] = await this.db
        .update(schema.announcements)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(schema.announcements.id, id))
        .returning();

      for (const row of inserted) {
        await this.sendQueue.add('deliver', {
          recipientId: row.id,
          announcementId: id,
        } satisfies SendAnnouncementJobData);
      }

      return { announcement: updated, recipientCount: contacts.length };
    } catch (err) {
      throw new InternalServerErrorException('Failed to send announcement');
    }
  }

  async getRecipients(userId: string, id: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, id), eq(schema.announcements.userId, userId)));

    if (!announcement) throw new NotFoundException('Announcement not found');

    const recipients = await this.db
      .select({
        id: schema.announcementRecipients.id,
        status: schema.announcementRecipients.status,
        sentAt: schema.announcementRecipients.sentAt,
        error: schema.announcementRecipients.error,
        contact: {
          id: schema.contacts.id,
          name: schema.contacts.name,
          email: schema.contacts.email,
        },
      })
      .from(schema.announcementRecipients)
      .innerJoin(schema.contacts, eq(schema.announcementRecipients.contactId, schema.contacts.id))
      .where(eq(schema.announcementRecipients.announcementId, id));

    return recipients;
  }

  async delete(userId: string, id: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, id), eq(schema.announcements.userId, userId)));

    if (!announcement) throw new NotFoundException('Announcement not found');

    await this.db.delete(schema.announcements).where(eq(schema.announcements.id, id));
  }

  async getAnnouncementById(userId: string, id: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, id), eq(schema.announcements.userId, userId)));

      if (!announcement) throw new NotFoundException('Announcement not found');
      return announcement;
  }

  async markViewed(userId: string, announcementId: string, recipientId: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, announcementId), eq(schema.announcements.userId, userId)));

    if (!announcement) throw new NotFoundException('Announcement not found');

    const [recipient] = await this.db
      .update(schema.announcementRecipients)
      .set({ viewedAt: new Date() })
      .where(and(
        eq(schema.announcementRecipients.id, recipientId),
        eq(schema.announcementRecipients.announcementId, announcementId),
      ))
      .returning();

    if (!recipient) throw new NotFoundException('Recipient not found');
    return recipient;
  }
}
