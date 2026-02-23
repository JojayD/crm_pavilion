import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './database/drizzle.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { ContactsModule } from './contacts/contacts.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { SequencesModule } from './sequences/sequences.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DrizzleModule,
    AuthModule,
    QueueModule,
    ContactsModule,
    AnnouncementsModule,
    SequencesModule,
    WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
