import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AttachmentsService } from './attachments.service';
import { ActivityLogModule } from '../activity-log';

@Module({
  providers: [TasksService],
  controllers: [TasksController],
  providers: [TasksService, AttachmentsService],
  exports: [TasksService, AttachmentsService],
})
export class TasksModule {}
