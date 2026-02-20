import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { SequencesModule } from '../sequences/sequences.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsProcessor } from './workflows.processor';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    AuthModule,
    QueueModule,
    BullModule.registerQueue({ name: 'workflow-execute' }),
    SequencesModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsProcessor],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
