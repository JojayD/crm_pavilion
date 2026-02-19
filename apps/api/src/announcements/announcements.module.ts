import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsProcessor],
})
export class AnnouncementsModule {}
