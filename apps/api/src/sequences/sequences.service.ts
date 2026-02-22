import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { asc, and, eq, sql } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { DRIZZLE } from '../database/drizzle.module';
import * as schema from '../database/schema';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { EnrollContactDto } from './dto/enroll-contact.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ProcessStepJobData } from './sequences.processor';

@Injectable()
export class SequencesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue('sequence-step') private readonly sequenceQueue: Queue,
  ) {}

  // Sequences
  async findAll(userId: string) {
    return this.db
      .select({
        id: schema.sequences.id,
        name: schema.sequences.name,
        status: schema.sequences.status,
        createdAt: schema.sequences.createdAt,
        stepCount: sql<number>`(
          select count(*) from sequence_steps
          where sequence_steps.sequence_id = ${schema.sequences.id}
        )`.mapWith(Number),
      })
      .from(schema.sequences)
      .where(eq(schema.sequences.userId, userId));
  }

  async findOne(userId: string, id: string) {
    const [sequence] = await this.db
      .select()
      .from(schema.sequences)
      .where(and(eq(schema.sequences.id, id), eq(schema.sequences.userId, userId)));
    console.log(sequence);
    if (!sequence) throw new NotFoundException('Sequence not found');
    return sequence;
  }

  async create(userId: string, dto: CreateSequenceDto) {
    const [sequence] = await this.db
      .insert(schema.sequences)
      .values({ ...dto, userId })
      .returning();
    return sequence;
  }

  async update(userId: string, id: string, dto: UpdateSequenceDto) {
    await this.findOne(userId, id);

    const [updated] = await this.db
      .update(schema.sequences)
      .set(dto)
      .where(eq(schema.sequences.id, id))
      .returning();

    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.db.delete(schema.sequences).where(eq(schema.sequences.id, id));
  }

  // Steps 

  async findSteps(userId: string, sequenceId: string) {
    await this.findOne(userId, sequenceId);

    return this.db
      .select()
      .from(schema.sequenceSteps)
      .where(eq(schema.sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(schema.sequenceSteps.stepOrder));
  }

  async createStep(userId: string, sequenceId: string, dto: CreateStepDto) {
    await this.findOne(userId, sequenceId);

    const [step] = await this.db
      .insert(schema.sequenceSteps)
      .values({ ...dto, sequenceId })
      .returning();
    return step;
  }

  async updateStep(userId: string, sequenceId: string, stepId: string, dto: UpdateStepDto) {
    await this.findOne(userId, sequenceId);

    const [step] = await this.db
      .select()
      .from(schema.sequenceSteps)
      .where(and(eq(schema.sequenceSteps.id, stepId), eq(schema.sequenceSteps.sequenceId, sequenceId)));

    if (!step) throw new NotFoundException('Step not found');

    const [updated] = await this.db
      .update(schema.sequenceSteps)
      .set(dto)
      .where(eq(schema.sequenceSteps.id, stepId))
      .returning();

    return updated;
  }

  async removeStep(userId: string, sequenceId: string, stepId: string) {
    await this.findOne(userId, sequenceId);

    const [step] = await this.db
      .select()
      .from(schema.sequenceSteps)
      .where(and(eq(schema.sequenceSteps.id, stepId), eq(schema.sequenceSteps.sequenceId, sequenceId)));

    if (!step) throw new NotFoundException('Step not found');

    await this.db.delete(schema.sequenceSteps).where(eq(schema.sequenceSteps.id, stepId));
  }

  // Enrollments

  async enroll(userId: string, sequenceId: string, dto: EnrollContactDto) {
    const sequence = await this.findOne(userId, sequenceId);

    if (sequence.status !== 'active') {
      throw new BadRequestException('Cannot enroll into a sequence that is not active');
    }

    // Verify contact belongs to this user
    const [contact] = await this.db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, dto.contactId), eq(schema.contacts.userId, userId)));

    if (!contact) throw new NotFoundException('Contact not found');

    // Guard against double-enrollment: block if an active enrollment already exists
    const [existing] = await this.db
      .select()
      .from(schema.sequenceEnrollments)
      .where(and(
        eq(schema.sequenceEnrollments.contactId, dto.contactId),
        eq(schema.sequenceEnrollments.sequenceId, sequenceId),
        eq(schema.sequenceEnrollments.status, 'active'),
      ));
    if (existing) {
      throw new BadRequestException('Contact is already actively enrolled in this sequence');
    }

    // Load steps ordered by stepOrder to find the first step
    const steps = await this.db
      .select()
      .from(schema.sequenceSteps)
      .where(eq(schema.sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(schema.sequenceSteps.stepOrder));

    if (steps.length === 0) {
      throw new BadRequestException('Sequence has no steps — add steps before enrolling contacts');
    }

    const firstStep = steps[0];
    const enrolledAt = new Date();
    const target = new Date(enrolledAt);
    target.setUTCDate(target.getUTCDate() + firstStep.dayOffset);
    target.setUTCHours(firstStep.sendHour ?? 9, 0, 0, 0);
    if (target <= enrolledAt) target.setUTCDate(target.getUTCDate() + 1);
    const nextStepAt = target;

    const [enrollment] = await this.db
      .insert(schema.sequenceEnrollments)
      .values({
        contactId: dto.contactId,
        sequenceId,
        enrolledAt,
        nextStepAt,
        currentStepIndex: 0,
        status: 'active',
      })
      .returning();

    await this.sequenceQueue.add(
      'process-step',
      { enrollmentId: enrollment.id } satisfies ProcessStepJobData,
      { delay: nextStepAt.getTime() - Date.now() },
    );

    return enrollment;
  }

  async findEnrollments(userId: string, sequenceId: string) {
    await this.findOne(userId, sequenceId);

    return this.db
      .select({
        id: schema.sequenceEnrollments.id,
        status: schema.sequenceEnrollments.status,
        currentStepIndex: schema.sequenceEnrollments.currentStepIndex,
        nextStepAt: schema.sequenceEnrollments.nextStepAt,
        enrolledAt: schema.sequenceEnrollments.enrolledAt,
        contact: {
          id: schema.contacts.id,
          name: schema.contacts.name,
          email: schema.contacts.email,
        },
      })
      .from(schema.sequenceEnrollments)
      .innerJoin(schema.contacts, eq(schema.sequenceEnrollments.contactId, schema.contacts.id))
      .where(eq(schema.sequenceEnrollments.sequenceId, sequenceId));
  }

  async updateEnrollment(userId: string, sequenceId: string, enrollmentId: string, dto: UpdateEnrollmentDto) {
    await this.findOne(userId, sequenceId);

    const [enrollment] = await this.db
      .select()
      .from(schema.sequenceEnrollments)
      .where(and(
        eq(schema.sequenceEnrollments.id, enrollmentId),
        eq(schema.sequenceEnrollments.sequenceId, sequenceId),
      ));

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const [updated] = await this.db
      .update(schema.sequenceEnrollments)
      .set({ status: dto.status })
      .where(eq(schema.sequenceEnrollments.id, enrollmentId))
      .returning();

    return updated;
  }

  // ─── Step Logs ────────────────────────────────────────────────────────────

  async findStepLogs(userId: string, sequenceId: string, enrollmentId: string) {
    await this.findOne(userId, sequenceId);

    const [enrollment] = await this.db
      .select()
      .from(schema.sequenceEnrollments)
      .where(and(
        eq(schema.sequenceEnrollments.id, enrollmentId),
        eq(schema.sequenceEnrollments.sequenceId, sequenceId),
      ));

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return this.db
      .select()
      .from(schema.sequenceStepLogs)
      .where(eq(schema.sequenceStepLogs.enrollmentId, enrollmentId))
      .orderBy(asc(schema.sequenceStepLogs.createdAt));
  }

  // Process Step (called by SequencesProcessor when a BullMQ job fires)

  async processStep(enrollmentId: string) {
    const [enrollment] = await this.db
      .select()
      .from(schema.sequenceEnrollments)
      .where(eq(schema.sequenceEnrollments.id, enrollmentId));

    if (!enrollment || enrollment.status !== 'active') return;

    const steps = await this.db
      .select()
      .from(schema.sequenceSteps)
      .where(eq(schema.sequenceSteps.sequenceId, enrollment.sequenceId))
      .orderBy(asc(schema.sequenceSteps.stepOrder));

    const currentStep = steps[enrollment.currentStepIndex];
    if (!currentStep) return;

    // Insert a log row for this step execution
    const [log] = await this.db
      .insert(schema.sequenceStepLogs)
      .values({
        enrollmentId,
        stepId: currentStep.id,
        channel: currentStep.channel,
        contentSnapshot: currentStep.content,
        status: 'pending',
      })
      .returning();

    try {
      // TODO: plug in da real stuff in here delivery here (Resend, Twilio, FCM, etc.)
      // await this.messageDeliveryService.send({
      //   channel: currentStep.channel,
      //   contactId: enrollment.contactId,
      //   content: currentStep.content,
      // });

      await this.db
        .update(schema.sequenceStepLogs)
        .set({ status: 'completed', sentAt: new Date() })
        .where(eq(schema.sequenceStepLogs.id, log.id));
    } catch (err: any) {
      await this.db
        .update(schema.sequenceStepLogs)
        .set({ status: 'failed', error: err?.message ?? 'Unknown error' })
        .where(eq(schema.sequenceStepLogs.id, log.id));

      throw err; // re-throw so BullMQ retries the job
    }

    const nextIndex = enrollment.currentStepIndex + 1;
    const nextStep = steps[nextIndex];

    if (nextStep) {
      // Advance enrollment to the next step and schedule it
      const now = new Date();
      const target = new Date(now);
      target.setUTCDate(target.getUTCDate() + nextStep.dayOffset);
      target.setUTCHours(nextStep.sendHour ?? 9, 0, 0, 0);
      if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
      const nextStepAt = target;

      await this.db
        .update(schema.sequenceEnrollments)
        .set({ currentStepIndex: nextIndex, nextStepAt })
        .where(eq(schema.sequenceEnrollments.id, enrollmentId));

      await this.sequenceQueue.add(
        'process-step',
        { enrollmentId } satisfies ProcessStepJobData,
        { delay: nextStepAt.getTime() - Date.now() },
      );
    } else {
      // No more steps — enrollment is complete
      await this.db
        .update(schema.sequenceEnrollments)
        .set({ status: 'completed' })
        .where(eq(schema.sequenceEnrollments.id, enrollmentId));
    }
  }
}
