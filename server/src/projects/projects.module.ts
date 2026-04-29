import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ActivityLogModule } from '../activity-log';
import { UsersModule } from '../users';

@Module({
  imports: [ActivityLogModule, UsersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
