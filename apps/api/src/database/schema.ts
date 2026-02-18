import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer, jsonb, index } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive']);

export const channelEnum = pgEnum('channel', ['email', 'sms', 'push']);

export const announcementStatusEnum = pgEnum('announcement_status', ['draft', 'sent']);

export const sequenceStatusEnum = pgEnum('sequence_status', ['draft', 'active', 'paused']);

export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'paused', 'completed', 'cancelled']);

export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'active', 'paused']);

export const triggerTypeEnum = pgEnum('trigger_type', ['contact_created', 'tag_added', 'scheduled', 'member_inactive']);

export const actionTypeEnum = pgEnum('action_type', ['send_message', 'add_to_sequence', 'add_tag']);

export const executionStatusEnum = pgEnum('execution_status', ['pending', 'completed', 'failed', 'skipped']);

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  status: statusEnum('status').default('active').notNull(),
  tags: text('tags').array(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  channel: text('channel').notNull(),
  content: text('content').notNull(),
  status: announcementStatusEnum('status').default('draft').notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recipientStatusEnum = pgEnum('recipient_status', ['pending', 'sent', 'failed']);

export const announcementRecipients = pgTable('announcement_recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  status: recipientStatusEnum('status').default('pending').notNull(),
  sentAt: timestamp('sent_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sequences = pgTable('sequences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  status: sequenceStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sequenceSteps = pgTable('sequence_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  sequenceId: uuid('sequence_id').notNull().references(() => sequences.id, { onDelete: 'cascade' }),
  dayOffset: integer('day_offset').notNull(),
  stepOrder: integer('step_order').notNull(),
  channel: channelEnum('channel').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sequenceEnrollments = pgTable('sequence_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  sequenceId: uuid('sequence_id').notNull().references(() => sequences.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  status: enrollmentStatusEnum('status').default('active').notNull(),
  currentStepIndex: integer('current_step_index').default(0).notNull(),
  nextStepAt: timestamp('next_step_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_enrollments_next_step').on(t.nextStepAt, t.status),
]);

export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  triggerConfig: jsonb('trigger_config'),
  conditions: jsonb('conditions'),
  status: workflowStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workflowActions = pgTable('workflow_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  actionType: actionTypeEnum('action_type').notNull(),
  actionConfig: jsonb('action_config'),
  executionOrder: integer('execution_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
  status: executionStatusEnum('status').default('pending').notNull(),
  error: text('error'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
