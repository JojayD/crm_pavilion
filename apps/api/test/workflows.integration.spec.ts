import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { DrizzleModule, DRIZZLE } from '../src/database/drizzle.module';
import { QueueModule } from '../src/queue/queue.module';
import { SequencesModule } from '../src/sequences/sequences.module';
import { SequencesService } from '../src/sequences/sequences.service';
import { WorkflowsModule } from '../src/workflows/workflows.module';
import { WorkflowsService } from '../src/workflows/workflows.service';
import { ContactsModule } from '../src/contacts/contacts.module';
import { ContactsService } from '../src/contacts/contacts.service';
import * as schema from '../src/database/schema';

describe('WorkflowsService Integration — Manager Onboarding', () => {
  let app: INestApplication;
  let sequencesService: SequencesService;
  let workflowsService: WorkflowsService;
  let contactsService: ContactsService;
  let db: any;
  const testUserId = randomUUID();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DrizzleModule,
        QueueModule,
        SequencesModule,
        WorkflowsModule,
        ContactsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sequencesService = moduleFixture.get<SequencesService>(SequencesService);
    workflowsService = moduleFixture.get<WorkflowsService>(WorkflowsService);
    contactsService = moduleFixture.get<ContactsService>(ContactsService);
    db = moduleFixture.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    if (!db) return;
    // workflowExecutions has FKs on both workflowId and contactId, so delete them
    // before deleting workflows or contacts. workflowActions cascade from workflow FK.
    // sequenceEnrollments and sequenceSteps cascade from sequences FK.
    const userWorkflows = await db
      .select({ id: schema.workflows.id })
      .from(schema.workflows)
      .where(eq(schema.workflows.userId, testUserId));

    for (const wf of userWorkflows) {
      await db
        .delete(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, wf.id));
    }

    await db.delete(schema.contacts).where(eq(schema.contacts.userId, testUserId));
    await db.delete(schema.sequences).where(eq(schema.sequences.userId, testUserId));
    await db.delete(schema.workflows).where(eq(schema.workflows.userId, testUserId));
  });

  describe('happy path — manager tag triggers enrollment', () => {
    it('enrolls the contact and logs a completed execution', async () => {
      // ── Step 1: create contact BEFORE any active workflow exists ──────────
      // triggerEvent() is called internally but finds no active workflows → no-op.
      const contact = await contactsService.create(testUserId, {
        name: 'Jane Smith',
        email: 'jane@example.com',
        tags: ['manager'],
      });

      expect(contact.id).toBeDefined();

      // ── Step 2–4: create and activate the sequence with two steps ──────────
      const sequence = await sequencesService.create(testUserId, {
        name: 'Manager Onboarding',
      });

      await sequencesService.update(testUserId, sequence.id, { status: 'active' });

      await sequencesService.createStep(testUserId, sequence.id, {
        dayOffset: 0,
        stepOrder: 0,
        channel: 'email',
        content: 'Welcome! We\'re glad to have you on board.',
      });

      await sequencesService.createStep(testUserId, sequence.id, {
        dayOffset: 1,
        stepOrder: 1,
        channel: 'email',
        content: 'Any questions or concerns? Reach out to support@company.com',
      });

      // ── Step 5–7: create workflow and activate it ─────────────────────────
      const workflow = await workflowsService.create(testUserId, {
        name: 'Manager Onboarding Workflow',
        triggerType: 'contact_created',
        conditions: [{ field: 'tags', op: 'contains', value: 'manager' }],
      });

      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_to_sequence',
        actionConfig: { sequenceId: sequence.id },
        executionOrder: 0,
      });

      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      // ── Step 8: directly execute the workflow (simulates BullMQ processor) ─
      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      // ── Assert a: enrollment row exists with status='active' ────────────────
      const [enrollment] = await db
        .select()
        .from(schema.sequenceEnrollments)
        .where(
          eq(schema.sequenceEnrollments.contactId, contact.id),
        );

      expect(enrollment).toBeDefined();
      expect(enrollment.sequenceId).toBe(sequence.id);
      expect(enrollment.status).toBe('active');

      // ── Assert b: execution row exists with status='completed' ──────────────
      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution).toBeDefined();
      expect(execution.contactId).toBe(contact.id);
      expect(execution.status).toBe('completed');
    });
  });

  describe('conditions gate — non-manager tag skips enrollment', () => {
    it('does not enroll or log an execution when conditions fail', async () => {
      // Contact has 'sales' tag, not 'manager' → conditions will fail
      const contact = await contactsService.create(testUserId, {
        name: 'Bob Sales',
        email: 'bob@example.com',
        tags: ['sales'],
      });

      // Sequence
      const sequence = await sequencesService.create(testUserId, {
        name: 'Manager Onboarding',
      });
      await sequencesService.update(testUserId, sequence.id, { status: 'active' });
      await sequencesService.createStep(testUserId, sequence.id, {
        dayOffset: 0,
        stepOrder: 0,
        channel: 'email',
        content: 'Welcome! We\'re glad to have you on board.',
      });

      // Workflow
      const workflow = await workflowsService.create(testUserId, {
        name: 'Manager Onboarding Workflow',
        triggerType: 'contact_created',
        conditions: [{ field: 'tags', op: 'contains', value: 'manager' }],
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_to_sequence',
        actionConfig: { sequenceId: sequence.id },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      // Attempt execution — conditions should fail, nothing written
      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      // Assert: zero enrollment rows for this contact
      const enrollments = await db
        .select()
        .from(schema.sequenceEnrollments)
        .where(eq(schema.sequenceEnrollments.contactId, contact.id));

      expect(enrollments).toHaveLength(0);

      // Assert: no execution log either
      const executions = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(executions).toHaveLength(0);
    });
    
  });
});
