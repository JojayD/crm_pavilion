import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResendModule } from 'nestjs-resend';
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
    ResendModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get<string>('RESEND_API_KEY', ''),
      }),
    }),
  ],
  controllers: [SequencesController],
  providers: [SequencesService, SequencesProcessor],
  exports: [SequencesService],
})
export class SequencesModule {}
