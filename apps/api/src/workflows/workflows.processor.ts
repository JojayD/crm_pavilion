import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WorkflowsService } from './workflows.service';

export interface ExecuteWorkflowJobData {
  workflowId: string;
  contactId: string;
  userId: string;
}

@Processor('workflow-execute')
export class WorkflowsProcessor extends WorkerHost {
  constructor(private readonly workflowsService: WorkflowsService) {
    super();
  }

  async process(job: Job<ExecuteWorkflowJobData>): Promise<void> {
    const { workflowId, contactId, userId } = job.data;
    await this.workflowsService.executeWorkflow(workflowId, contactId, userId);
    // On error, executeWorkflow throws → BullMQ retries the job automatically
  }
}
