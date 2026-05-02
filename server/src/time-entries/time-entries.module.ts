import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

@Module({
  imports: [TasksModule, UsersModule],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
