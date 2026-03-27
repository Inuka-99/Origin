// Controller for handling task-related HTTP requests
import { Controller, Patch, Param, Body, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  // Inject the TasksService
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Update the status of a task
   * PATCH /tasks/:id/status
   * Body: { status: 'todo' | 'in_progress' | 'done' }
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const updated = this.tasksService.updateTaskStatus(id, status as any);
    if (!updated) {
      throw new NotFoundException('Task not found');
    }
    return updated;
  }

  /**
   * Assign a task to a user
   * PATCH /tasks/:id/assign
   * Body: { userId: string }
   */
  @Patch(':id/assign')
  assignTask(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    const updated = this.tasksService.assignTask(id, userId);
    if (!updated) {
      throw new NotFoundException('Task not found');
    }
    return updated;
  }
}
