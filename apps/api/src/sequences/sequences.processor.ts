import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SequencesService } from './sequences.service';

export interface ProcessStepJobData {
  enrollmentId: string;
}

@Processor('sequence-step')
export class SequencesProcessor extends WorkerHost {
  constructor(private readonly sequencesService: SequencesService) {
    super();
  }

  async process(job: Job<ProcessStepJobData>): Promise<void> {
    await this.sequencesService.processStep(job.data.enrollmentId);
    // On error, processStep throws → BullMQ retries the job automatically
  }
}
