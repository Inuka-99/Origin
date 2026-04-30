import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ActivityLogModule } from '../activity-log';
import { UsersModule } from '../users';

@Module({
  imports: [ActivityLogModule, UsersModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
