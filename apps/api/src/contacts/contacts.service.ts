import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { and, arrayContains, desc, eq } from 'drizzle-orm';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class ContactsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async findAll(userId: string, filters?: { company?: string; tag?: string; status?: string }) {
    const conditions = [eq(schema.contacts.userId, userId)];
    if (filters?.company) conditions.push(eq(schema.contacts.company, filters.company));
    if (filters?.tag) conditions.push(arrayContains(schema.contacts.tags, [filters.tag]));
    if (filters?.status) conditions.push(eq(schema.contacts.status, filters.status as any));

    return this.db
      .select()
      .from(schema.contacts)
      .where(and(...conditions))
      .orderBy(desc(schema.contacts.createdAt));

  }

  async create(userId: string, dto: CreateContactDto) {
    if (dto.email) {
      const [existing] = await this.db
        .select()
        .from(schema.contacts)
        .where(and(eq(schema.contacts.email, dto.email), eq(schema.contacts.userId, userId)));

      if (existing) throw new ConflictException('A contact with this email already exists');
    }
    const [contact] = await this.db
      .insert(schema.contacts)
      .values({ ...dto, userId })
      .returning();

    await this.workflowsService.triggerEvent('contact_created', contact.id, userId);

    return contact;
  }

  async update(userId: string, id: string, dto: UpdateContactDto) {
    // Fetch existing contact when we need to detect changes (tags or status)
    let addedTags: string[] = [];
    let existingStatus: string | null = null;

    if (dto.tags !== undefined || dto.status !== undefined) {
      const [existing] = await this.db
        .select({ tags: schema.contacts.tags, status: schema.contacts.status })
        .from(schema.contacts)
        .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)));

      if (dto.tags !== undefined) {
        const existingTags = existing?.tags ?? [];
        addedTags = (dto.tags ?? []).filter((t: string) => !existingTags.includes(t));
      }
      existingStatus = existing?.status ?? null;
    }

    const [contact] = await this.db
      .update(schema.contacts)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
      .returning();

    if (contact) {
      for (const tag of addedTags) {
        await this.workflowsService.triggerEvent('tag_added', contact.id, userId, { tag });
      }

      // Detect status → inactive transition
      if (dto.status === 'inactive' && existingStatus !== 'inactive') {
        await this.workflowsService.triggerEvent('member_inactive', contact.id, userId);
      }
    }

    return contact;
  }

  async delete(userId: string, id: string) {
    const [contact] = await this.db
      .delete(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
      .returning();
    return contact;
  }

  async getById(userId: string, id: string) {
    const [contact] = await this.db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)));
    return contact;
  }
}
