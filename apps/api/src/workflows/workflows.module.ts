import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResendModule } from 'nestjs-resend';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { SequencesModule } from '../sequences/sequences.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsProcessor } from './workflows.processor';
import { WorkflowsScheduler } from './workflows.scheduler';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    AuthModule,
    QueueModule,
    BullModule.registerQueue({ name: 'workflow-execute' }),
    SequencesModule,
    ResendModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get<string>('RESEND_API_KEY', ''),
      }),
    }),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsProcessor, WorkflowsScheduler],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
