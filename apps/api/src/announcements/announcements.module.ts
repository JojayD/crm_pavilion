import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResendModule } from 'nestjs-resend';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsProcessor } from './announcements.processor';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [
    AuthModule,
    QueueModule,
    BullModule.registerQueue({ name: 'announcement-send' }),
    ResendModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get<string>('RESEND_API_KEY', ''),
      }),
    }),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsProcessor],
})
export class AnnouncementsModule {}
