import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [AuthModule, WorkflowsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
