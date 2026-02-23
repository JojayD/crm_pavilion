import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { and, asc, desc, eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { ResendService } from 'nestjs-resend';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';
import { SequencesService } from '../sequences/sequences.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { ExecuteWorkflowJobData } from './workflows.processor';

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('workflow-execute') private readonly workflowQueue: Queue,
    private readonly sequencesService: SequencesService,
    private readonly resendService: ResendService,
  ) {}

  //  Workflows CRUD

  async findAll(userId: string) {
    return this.db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.userId, userId))
      .orderBy(desc(schema.workflows.createdAt));
  }

  async findOne(userId: string, id: string) {
    const [workflow] = await this.db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, userId)));

    if (!workflow) throw new NotFoundException('Workflow not found');

    const actions = await this.db
      .select()
      .from(schema.workflowActions)
      .where(eq(schema.workflowActions.workflowId, id))
      .orderBy(asc(schema.workflowActions.executionOrder));

    return { ...workflow, actions };
  }

  async create(userId: string, dto: CreateWorkflowDto) {
    const [workflow] = await this.db
      .insert(schema.workflows)
      .values({ ...dto, userId })
      .returning();
    return workflow;
  }

  async update(userId: string, id: string, dto: UpdateWorkflowDto) {
    await this.findOne(userId, id);

    const [updated] = await this.db
      .update(schema.workflows)
      .set(dto)
      .where(eq(schema.workflows.id, id))
      .returning();

    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.delete(schema.workflows).where(eq(schema.workflows.id, id));
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async addAction(userId: string, workflowId: string, dto: CreateActionDto) {
    await this.findOne(userId, workflowId);

    const [action] = await this.db
      .insert(schema.workflowActions)
      .values({ ...dto, workflowId })
      .returning();

    return action;
  }

  async updateAction(userId: string, workflowId: string, actionId: string, dto: UpdateActionDto) {
    await this.findOne(userId, workflowId);

    const [action] = await this.db
      .select()
      .from(schema.workflowActions)
      .where(and(
        eq(schema.workflowActions.id, actionId),
        eq(schema.workflowActions.workflowId, workflowId),
      ));

    if (!action) throw new NotFoundException('Action not found');

    const [updated] = await this.db
      .update(schema.workflowActions)
      .set(dto)
      .where(eq(schema.workflowActions.id, actionId))
      .returning();

    return updated;
  }

  async removeAction(userId: string, workflowId: string, actionId: string) {
    await this.findOne(userId, workflowId);

    const [action] = await this.db
      .select()
      .from(schema.workflowActions)
      .where(and(
        eq(schema.workflowActions.id, actionId),
        eq(schema.workflowActions.workflowId, workflowId),
      ));

    if (!action) throw new NotFoundException('Action not found');

    await this.db.delete(schema.workflowActions).where(eq(schema.workflowActions.id, actionId));
  }

  // Executions 

  async findExecutions(userId: string, workflowId: string) {
    await this.findOne(userId, workflowId);

    return this.db
      .select({
        id: schema.workflowExecutions.id,
        status: schema.workflowExecutions.status,
        triggeredAt: schema.workflowExecutions.triggeredAt,
        completedAt: schema.workflowExecutions.completedAt,
        error: schema.workflowExecutions.error,
        contact: {
          id: schema.contacts.id,
          name: schema.contacts.name,
          email: schema.contacts.email,
        },
      })
      .from(schema.workflowExecutions)
      .innerJoin(schema.contacts, eq(schema.workflowExecutions.contactId, schema.contacts.id))
      .where(eq(schema.workflowExecutions.workflowId, workflowId))
      .orderBy(desc(schema.workflowExecutions.triggeredAt));
  }

  // Trigger by ContactsService

  async triggerEvent(
    type: 'contact_created' | 'tag_added' | 'scheduled' | 'member_inactive',
    contactId: string,
    userId: string,
    meta?: { tag?: string },
  ) {
    const activeWorkflows = await this.db
      .select()
      .from(schema.workflows)
      .where(and(
        eq(schema.workflows.userId, userId),
        eq(schema.workflows.triggerType, type),
        eq(schema.workflows.status, 'active'),
      ));

    for (const workflow of activeWorkflows) {
      // For tag_added, only fire if the workflow's configured tag matches
      if (type === 'tag_added') {
        const configTag = (workflow.triggerConfig as any)?.tag;
        if (configTag && configTag !== meta?.tag) continue;
      }

      await this.workflowQueue.add(
        'execute-workflow',
        { workflowId: workflow.id, contactId, userId } satisfies ExecuteWorkflowJobData,
      );
    }
  }

  //Execute (called by WorkflowsProcessor) 

  async executeWorkflow(workflowId: string, contactId: string, userId: string) {
    const [workflow] = await this.db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.id, workflowId));

    const [contact] = await this.db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId));

    if (!workflow || !contact) return;

    const conditions = (workflow.conditions as any[]) ?? [];
    if (!this.evaluateConditions(contact, conditions)) {
      // Conditions not met — skip without logging
      return;
    }

    const actions = await this.db
      .select()
      .from(schema.workflowActions)
      .where(eq(schema.workflowActions.workflowId, workflowId))
      .orderBy(asc(schema.workflowActions.executionOrder));

    const [execution] = await this.db
      .insert(schema.workflowExecutions)
      .values({ workflowId, contactId, status: 'pending' })
      .returning();

    try {
      for (const action of actions) {
        await this.executeAction(action, contact, userId);
      }

      await this.db
        .update(schema.workflowExecutions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(schema.workflowExecutions.id, execution.id));
    } catch (err: any) {
      await this.db
        .update(schema.workflowExecutions)
        .set({ status: 'failed', error: err?.message ?? 'Unknown error', completedAt: new Date() })
        .where(eq(schema.workflowExecutions.id, execution.id));

      throw err; // re-throw for BullMQ retry
    }
  }

  private async executeAction(action: any, contact: any, userId: string) {
    const config = (action.actionConfig ?? {}) as any;

    switch (action.actionType) {
      case 'add_to_sequence': {
        try {
          await this.sequencesService.enroll(userId, config.sequenceId, { contactId: contact.id });
        } catch (err: any) {
          // Duplicate enrollment is a no-op, not a failure
          if (err?.message?.includes('already actively enrolled')) return;
          throw err;
        }
        break;
      }

      case 'add_tag': {
        const tag: string = config.tag;
        if (!tag) return;
        const currentTags: string[] = contact.tags ?? [];
        if (currentTags.includes(tag)) return; // already has the tag
        await this.db
          .update(schema.contacts)
          .set({ tags: [...currentTags, tag], updatedAt: new Date() })
          .where(eq(schema.contacts.id, contact.id));
        // Reflect the change so subsequent actions in this job see updated tags
        contact.tags = [...currentTags, tag];
        break;
      }

      case 'send_message': {
        if (!contact.email) return; // no email, silently skip
        await this.resendService.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@example.com',
          to: contact.email,
          subject: config.subject ?? 'A message for you',
          text: config.body ?? '',
        });
        break;
      }
    }
  }

  async triggerScheduledWorkflows(preset: string, hour: number) {
    const workflows = await this.db.select().from(schema.workflows)
      .where(and(
        eq(schema.workflows.triggerType, 'scheduled'),
        eq(schema.workflows.status, 'active'),
      ));

    const matchingWorkflows = workflows.filter((w: any) => {
      const config = w.triggerConfig as any;
      return config?.preset === preset && Number(config?.hour) === hour;
    });

    for (const workflow of matchingWorkflows) {
      const contacts = await this.db.select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(eq(schema.contacts.userId, workflow.userId));

      for (const contact of contacts) {
        await this.workflowQueue.add('execute-workflow', {
          workflowId: workflow.id,
          contactId: contact.id,
          userId: workflow.userId,
        } satisfies ExecuteWorkflowJobData);
      }
    }
  }

  private evaluateConditions(
    contact: any,
    conditions: Array<{ field: string; op: string; value: any }>,
  ): boolean {
    for (const condition of conditions) {
      const contactValue = contact[condition.field];
      switch (condition.op) {
        case 'eq':
          if (contactValue !== condition.value) return false;
          break;
        case 'neq':
          if (contactValue === condition.value) return false;
          break;
        case 'contains':
          if (!Array.isArray(contactValue) || !contactValue.includes(condition.value)) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }
}
