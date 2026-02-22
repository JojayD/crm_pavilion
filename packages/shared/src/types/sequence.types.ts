export type SequenceStatus = 'draft' | 'active' | 'paused';
export type SequenceChannel = 'email' | 'sms' | 'push';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Sequence {
  id: string;
  name: string;
  status: SequenceStatus;
  stepCount: number;
  createdAt: string;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  dayOffset: number;
  stepOrder: number;
  channel: SequenceChannel;
  content: string;
  sendHour: number;
  createdAt: string;
}

export interface SequenceEnrollment {
  id: string;
  status: EnrollmentStatus;
  currentStepIndex: number;
  nextStepAt: string | null;
  enrolledAt: string;
  contact: { id: string; name: string; email: string | null };
}
