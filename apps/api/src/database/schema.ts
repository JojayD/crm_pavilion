import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive']);

export const channelEnum = pgEnum('channel', ['email', 'sms', 'push']);

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  status: statusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  channel: text('channel').notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sentAt: timestamp('sent_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});