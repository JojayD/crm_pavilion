import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { ResendService } from 'nestjs-resend';
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

// ─────────────────────────────────────────────────────────────────────────────
// Extended integration tests — queue, send_message, add_tag, scheduled
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowsService Integration — Extended Coverage', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let sequencesService: SequencesService;
  let workflowsService: WorkflowsService;
  let contactsService: ContactsService;
  let db: any;
  let queue: Queue;
  const mockSend = jest.fn().mockResolvedValue({ id: 'msg-123' });
  const testUserId = randomUUID();

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DrizzleModule,
        QueueModule,
        SequencesModule,
        WorkflowsModule,
        ContactsModule,
      ],
    })
      .overrideProvider(ResendService)
      .useValue({ send: mockSend })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sequencesService = moduleFixture.get<SequencesService>(SequencesService);
    workflowsService = moduleFixture.get<WorkflowsService>(WorkflowsService);
    contactsService = moduleFixture.get<ContactsService>(ContactsService);
    db = moduleFixture.get(DRIZZLE);
    queue = moduleFixture.get<Queue>(getQueueToken('workflow-execute'));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockSend.mockClear();
  });

  afterEach(async () => {
    // Drain the queue
    await queue.obliterate({ force: true });

    if (!db) return;
    // Delete executions first (FK on workflowId and contactId)
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

  // ── Group 1: triggerEvent() — Queue Enqueueing ──────────────────────────────

  describe('triggerEvent() — queue enqueueing', () => {
    it('TC1 — contact_created enqueues one job per active matching workflow', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'Queue Test',
        email: 'queue@test.com',
      });

      // 2 active contact_created workflows
      const wf1 = await workflowsService.create(testUserId, {
        name: 'WF1',
        triggerType: 'contact_created',
      });
      await workflowsService.update(testUserId, wf1.id, { status: 'active' });

      const wf2 = await workflowsService.create(testUserId, {
        name: 'WF2',
        triggerType: 'contact_created',
      });
      await workflowsService.update(testUserId, wf2.id, { status: 'active' });

      // 1 active tag_added workflow (should NOT fire)
      const wf3 = await workflowsService.create(testUserId, {
        name: 'WF3',
        triggerType: 'tag_added',
      });
      await workflowsService.update(testUserId, wf3.id, { status: 'active' });

      // Drain any jobs from contact creation above before calling triggerEvent directly
      await queue.obliterate({ force: true });
      await queue.pause();

      await workflowsService.triggerEvent('contact_created', contact.id, testUserId);

      const jobs = await queue.getJobs(['waiting']);
      expect(jobs).toHaveLength(2);

      const workflowIds = jobs.map((j) => j.data.workflowId);
      expect(workflowIds).toContain(wf1.id);
      expect(workflowIds).toContain(wf2.id);
      jobs.forEach((j) => expect(j.data.contactId).toBe(contact.id));
      await queue.resume();
    });

    it('TC2 — tag_added only enqueues when tag matches triggerConfig.tag', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'Tag Match',
        email: 'tagmatch@test.com',
      });

      const wfA = await workflowsService.create(testUserId, {
        name: 'WF VIP',
        triggerType: 'tag_added',
        triggerConfig: { tag: 'vip' },
      });
      await workflowsService.update(testUserId, wfA.id, { status: 'active' });

      const wfB = await workflowsService.create(testUserId, {
        name: 'WF Manager',
        triggerType: 'tag_added',
        triggerConfig: { tag: 'manager' },
      });
      await workflowsService.update(testUserId, wfB.id, { status: 'active' });

      await queue.obliterate({ force: true });

      await workflowsService.triggerEvent('tag_added', contact.id, testUserId, { tag: 'vip' });

      const jobs = await queue.getJobs(['waiting']);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].data.workflowId).toBe(wfA.id);
    });

    it('TC3 — draft and paused workflows are NOT enqueued', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'Draft Paused Test',
        email: 'draftpaused@test.com',
      });

      // draft workflow (default status)
      await workflowsService.create(testUserId, {
        name: 'Draft WF',
        triggerType: 'contact_created',
      });

      // paused workflow: create, activate, then pause
      const wfPaused = await workflowsService.create(testUserId, {
        name: 'Paused WF',
        triggerType: 'contact_created',
      });
      await workflowsService.update(testUserId, wfPaused.id, { status: 'active' });
      await workflowsService.update(testUserId, wfPaused.id, { status: 'paused' });

      await queue.obliterate({ force: true });

      await workflowsService.triggerEvent('contact_created', contact.id, testUserId);

      const jobs = await queue.getJobs(['waiting']);
      expect(jobs).toHaveLength(0);
    });

    it('TC4 — contactsService.create() auto-enqueues via triggerEvent', async () => {
      // Create active workflow before creating the contact
      const wf = await workflowsService.create(testUserId, {
        name: 'Auto Enqueue WF',
        triggerType: 'contact_created',
      });
      await workflowsService.update(testUserId, wf.id, { status: 'active' });

      await queue.obliterate({ force: true });
      await queue.pause();

      const contact = await contactsService.create(testUserId, {
        name: 'Auto Enqueue Contact',
        email: 'autoenqueue@test.com',
      });

      const jobs = await queue.getJobs(['waiting']);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].data.contactId).toBe(contact.id);
      expect(jobs[0].data.workflowId).toBe(wf.id);
      await queue.resume();
    });
  });

  // ── Group 2: send_message Action ────────────────────────────────────────────

  describe('send_message action', () => {
    it('TC5 — sends email with correct payload', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'Alice',
        email: 'alice@test.com',
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Send Message WF',
        triggerType: 'contact_created',
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'send_message',
        actionConfig: { subject: 'Welcome!', body: 'Hello' },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        to: 'alice@test.com',
        subject: 'Welcome!',
        text: 'Hello',
        from: expect.any(String),
      });

      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution.status).toBe('completed');
    });

    it('TC6 — silently skips when contact has no email', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'No Email',
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'No Email WF',
        triggerType: 'contact_created',
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'send_message',
        actionConfig: { subject: 'Welcome!', body: 'Hello' },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      expect(mockSend).toHaveBeenCalledTimes(0);

      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution.status).toBe('completed');
    });

    it('TC7 — logs failed execution and re-throws when Resend throws', async () => {
      mockSend.mockRejectedValueOnce(new Error('rate limit'));

      const contact = await contactsService.create(testUserId, {
        name: 'Fail Test',
        email: 'fail@test.com',
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Fail WF',
        triggerType: 'contact_created',
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'send_message',
        actionConfig: { subject: 'Oops', body: 'Error' },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await expect(
        workflowsService.executeWorkflow(workflow.id, contact.id, testUserId),
      ).rejects.toThrow('rate limit');

      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution.status).toBe('failed');
      expect(execution.error).toBe('rate limit');
      expect(execution.completedAt).not.toBeNull();
    });
  });

  // ── Group 3: add_tag Action ─────────────────────────────────────────────────

  describe('add_tag action', () => {
    it('TC8 — appends tag and is idempotent on re-run', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'Bob',
        tags: ['existing'],
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Add Tag WF',
        triggerType: 'contact_created',
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_tag',
        actionConfig: { tag: 'new-tag' },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      // First run
      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      const [contactAfterFirst] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, contact.id));

      expect(contactAfterFirst.tags).toEqual(expect.arrayContaining(['existing', 'new-tag']));
      expect(contactAfterFirst.tags).toHaveLength(2);

      // Second run — should be idempotent
      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      const [contactAfterSecond] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, contact.id));

      expect(contactAfterSecond.tags).toEqual(expect.arrayContaining(['existing', 'new-tag']));
      expect(contactAfterSecond.tags).toHaveLength(2);

      const executions = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(executions).toHaveLength(2);
      executions.forEach((ex: any) => expect(ex.status).toBe('completed'));
    });
  });

  // ── Group 4: Multi-Action Sequencing ────────────────────────────────────────

  describe('multi-action sequencing', () => {
    it('TC9 — executes all 3 action types in order, all succeed', async () => {
      const contact = await contactsService.create(testUserId, {
        name: 'Carol',
        email: 'carol@test.com',
        tags: [],
      });

      const sequence = await sequencesService.create(testUserId, {
        name: 'Multi Action Sequence',
      });
      await sequencesService.update(testUserId, sequence.id, { status: 'active' });
      await sequencesService.createStep(testUserId, sequence.id, {
        dayOffset: 0,
        stepOrder: 0,
        channel: 'email',
        content: 'Step 1',
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Multi Action WF',
        triggerType: 'contact_created',
      });

      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_tag',
        actionConfig: { tag: 'processed' },
        executionOrder: 0,
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_to_sequence',
        actionConfig: { sequenceId: sequence.id },
        executionOrder: 1,
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'send_message',
        actionConfig: { subject: 'Done', body: 'Hi' },
        executionOrder: 2,
      });

      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      // Tag was added
      const [updatedContact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, contact.id));
      expect(updatedContact.tags).toContain('processed');

      // Enrollment exists
      const [enrollment] = await db
        .select()
        .from(schema.sequenceEnrollments)
        .where(eq(schema.sequenceEnrollments.contactId, contact.id));
      expect(enrollment).toBeDefined();
      expect(enrollment.sequenceId).toBe(sequence.id);

      // Email sent
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Execution completed
      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));
      expect(execution.status).toBe('completed');
    });
  });

  // ── Group 5: Scheduled Workflows ────────────────────────────────────────────

  describe('triggerScheduledWorkflows()', () => {
    it('TC10 — enqueues one job per contact for matching preset + hour', async () => {
      // Create 2 contacts
      const contactA = await contactsService.create(testUserId, {
        name: 'Scheduled A',
        email: 'schedA@test.com',
      });
      const contactB = await contactsService.create(testUserId, {
        name: 'Scheduled B',
        email: 'schedB@test.com',
      });

      // Matching workflow: daily at 9
      const wfA = await workflowsService.create(testUserId, {
        name: 'Daily 9am WF',
        triggerType: 'scheduled',
        triggerConfig: { preset: 'daily', hour: 9 },
      });
      await workflowsService.update(testUserId, wfA.id, { status: 'active' });

      // Non-matching workflow: weekly at 9
      const wfB = await workflowsService.create(testUserId, {
        name: 'Weekly 9am WF',
        triggerType: 'scheduled',
        triggerConfig: { preset: 'weekly', hour: 9 },
      });
      await workflowsService.update(testUserId, wfB.id, { status: 'active' });

      await queue.obliterate({ force: true });
      await queue.pause();

      await workflowsService.triggerScheduledWorkflows('daily', 9);

      const jobs = await queue.getJobs(['waiting']);
      expect(jobs).toHaveLength(2);

      const contactIds = jobs.map((j) => j.data.contactId);
      expect(contactIds).toContain(contactA.id);
      expect(contactIds).toContain(contactB.id);
      jobs.forEach((j) => expect(j.data.workflowId).toBe(wfA.id));
      await queue.resume();
    });

    it('TC11 — does not enqueue when hour does not match', async () => {
      await contactsService.create(testUserId, {
        name: 'Scheduled C',
        email: 'schedC@test.com',
      });

      const wf = await workflowsService.create(testUserId, {
        name: 'Daily 9am WF Wrong Hour',
        triggerType: 'scheduled',
        triggerConfig: { preset: 'daily', hour: 9 },
      });
      await workflowsService.update(testUserId, wf.id, { status: 'active' });

      await queue.obliterate({ force: true });

      await workflowsService.triggerScheduledWorkflows('daily', 14);

      const jobs = await queue.getJobs(['waiting']);
      expect(jobs).toHaveLength(0);
    });
  });

  // ── Group 6: Scheduled — daily 9AM, no conditions, action execution ──────────

  describe('scheduled — daily 9AM, no conditions, action execution', () => {
    it('TC12 — scheduled daily 9AM, no conditions, add_tag applies the tag', async () => {
      // ── TC12 START
      const contact = await contactsService.create(testUserId, {
        name: 'Dave',
        tags: ['subscriber'],
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Scheduled Add Tag WF',
        triggerType: 'scheduled',
        triggerConfig: { preset: 'daily', hour: 9 },
        conditions: [],
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_tag',
        actionConfig: { tag: 'daily-run' },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      const [updatedContact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, contact.id));

      expect(updatedContact.tags).toEqual(expect.arrayContaining(['subscriber', 'daily-run']));

      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution.status).toBe('completed');
      // ── TC12 END
    });

    it('TC13 — scheduled daily 9AM, no conditions, send_message sends email', async () => {
      // ── TC13 START
      const contact = await contactsService.create(testUserId, {
        name: 'Eve',
        email: 'eve@test.com',
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Scheduled Send Message WF',
        triggerType: 'scheduled',
        triggerConfig: { preset: 'daily', hour: 9 },
        conditions: [],
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'send_message',
        actionConfig: { subject: 'Daily Update', body: 'Here is your daily digest' },
        executionOrder: 0,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        to: 'eve@test.com',
        subject: 'Daily Update',
        text: 'Here is your daily digest',
        from: expect.any(String),
      });

      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution.status).toBe('completed');
      // ── TC13 END
    });

    it('TC14 — scheduled daily 9AM, no conditions, add_tag then send_message both run in order', async () => {
      // ── TC14 START
      const contact = await contactsService.create(testUserId, {
        name: 'Frank',
        email: 'frank@test.com',
        tags: [],
      });

      const workflow = await workflowsService.create(testUserId, {
        name: 'Scheduled Multi Action WF',
        triggerType: 'scheduled',
        triggerConfig: { preset: 'daily', hour: 9 },
        conditions: [],
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'add_tag',
        actionConfig: { tag: 'daily-processed' },
        executionOrder: 0,
      });
      await workflowsService.addAction(testUserId, workflow.id, {
        actionType: 'send_message',
        actionConfig: { subject: 'Daily', body: 'All done' },
        executionOrder: 1,
      });
      await workflowsService.update(testUserId, workflow.id, { status: 'active' });

      await workflowsService.executeWorkflow(workflow.id, contact.id, testUserId);

      const [updatedContact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, contact.id));

      expect(updatedContact.tags).toContain('daily-processed');
      expect(mockSend).toHaveBeenCalledTimes(1);

      const [execution] = await db
        .select()
        .from(schema.workflowExecutions)
        .where(eq(schema.workflowExecutions.workflowId, workflow.id));

      expect(execution.status).toBe('completed');
      // ── TC14 END
    });
  });
});
