// Service for managing tasks and business logic
import { Injectable } from '@nestjs/common';
import { Task, TaskStatus } from './task.model';
import { User } from '../users/user.model';

@Injectable()
export class TasksService {
  // In-memory array to store tasks (replace with DB in production)
  private tasks: Task[] = [
    {
      id: '1',
      title: 'Sample Task',
      description: 'This is a sample task',
      status: 'todo',
      assignedTo: undefined,
    },
  ];

  /**
   * Assign a task to a user by userId
   */
  assignTask(id: string, userId: string): Task | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.assignedTo = userId;
    }
    return task;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return this.tasks;
  }

  /**
   * Update the status of a task
   */
  updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = status;
    }
    return task;
  }
}
