import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class WorkflowsScheduler {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // Run every hour at :00 — check which scheduled workflows are due
  @Cron('0 * * * *')
  async runHourly() {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();   // 0=Sun, 1=Mon…
    const currentDate = now.getUTCDate(); // 1-31

    // Daily: any workflow with preset='daily' whose hour matches now
    await this.workflowsService.triggerScheduledWorkflows('daily', currentHour);

    // Weekly: only on Monday (day=1)
    if (currentDay === 1) {
      await this.workflowsService.triggerScheduledWorkflows('weekly', currentHour);
    }

    // Monthly: only on the 1st
    if (currentDate === 1) {
      await this.workflowsService.triggerScheduledWorkflows('monthly', currentHour);
    }
  }
}
