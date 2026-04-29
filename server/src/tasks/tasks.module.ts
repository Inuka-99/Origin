import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AttachmentsService } from './attachments.service';
import { ActivityLogModule } from '../activity-log';
import { UsersModule } from '../users';

@Module({
  imports: [ActivityLogModule, UsersModule],
  controllers: [TasksController],
  providers: [TasksService, AttachmentsService],
  exports: [TasksService, AttachmentsService],
})
export class TasksModule {}
