import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { SequencesController } from './sequences.controller';
import { SequencesProcessor } from './sequences.processor';
import { SequencesService } from './sequences.service';

@Module({
  imports: [
    AuthModule,
    QueueModule,
    BullModule.registerQueue({ name: 'sequence-step' }),
  ],
  controllers: [SequencesController],
  providers: [SequencesService, SequencesProcessor],
  exports: [SequencesService],
})
export class SequencesModule {}
