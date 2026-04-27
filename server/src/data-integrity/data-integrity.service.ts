import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase';

type IntegrityStatus = 'healthy' | 'warning' | 'critical';
type CheckSeverity = 'warning' | 'critical';
type CheckStatus = 'ok' | CheckSeverity;

export interface IntegrityCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  severity: CheckSeverity;
  inspectedCount: number;
  issueCount: number;
  details: string[];
  action: string;
}

export interface IntegritySnapshot {
  id: string;
  status: IntegrityStatus;
  score: number;
  table_counts: Record<string, number>;
  issue_counts: Record<string, number>;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface IntegrityReport {
  status: IntegrityStatus;
  score: number;
  checkedAt: string;
  totals: {
    projects: number;
    tasks: number;
    users: number;
    projectMembers: number;
    taskAssignments: number;
    activityLogs: number;
    integrationMappings: number;
  };
  issueCounts: Record<string, number>;
  checks: IntegrityCheck[];
  latestSnapshot: IntegritySnapshot | null;
}

interface ProjectRow {
  id: string;
  name?: string | null;
  start_date?: string | null;
  due_date?: string | null;
}

interface TaskRow {
  id: string;
  title?: string | null;
  project_id?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  status?: string | null;
  priority?: string | null;
}

interface ProfileRow {
  id: string;
}

interface ProjectMemberRow {
  id: string;
  project_id: string | null;
  user_id: string | null;
}

interface TaskAssignmentRow {
  task_id: string | null;
  user_id: string | null;
}

interface ActivityLogRow {
  id: string;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
}

interface GoogleCalendarTaskEventRow {
  task_id: string | null;
  user_id: string | null;
  google_event_id: string | null;
}

@Injectable()
export class DataIntegrityService {
  constructor(private readonly supabase: SupabaseService) {}

  async getReport(): Promise<IntegrityReport> {
    const [
      projects,
      tasks,
      profiles,
      projectMembers,
      taskAssignments,
      activityLogs,
      integrationMappings,
      latestSnapshot,
    ] = await Promise.all([
      this.selectRows<ProjectRow>('projects', 'id, name, start_date, due_date'),
      this.selectRows<TaskRow>('tasks', 'id, title, project_id, created_by, assigned_to, status, priority'),
      this.selectRows<ProfileRow>('profiles', 'id'),
      this.selectRows<ProjectMemberRow>('project_members', 'id, project_id, user_id'),
      this.selectRows<TaskAssignmentRow>('task_assignments', 'task_id, user_id'),
      this.selectRows<ActivityLogRow>('activity_logs', 'id, user_id, entity_type, entity_id, project_id'),
      this.selectOptionalRows<GoogleCalendarTaskEventRow>(
        'google_calendar_task_events',
        'task_id, user_id, google_event_id',
      ),
      this.getLatestSnapshot(),
    ]);

    const projectIds = new Set(projects.map((project) => project.id));
    const taskIds = new Set(tasks.map((task) => task.id));
    const profileIds = new Set(profiles.map((profile) => profile.id));
    const memberPairs = new Set(
      projectMembers
        .filter((member) => member.project_id && member.user_id)
        .map((member) => `${member.project_id}:${member.user_id}`),
    );
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const checks: IntegrityCheck[] = [
      this.checkProjectMembers(projectMembers, projectIds, profileIds),
      this.checkTasks(tasks, projectIds, profileIds),
      this.checkTaskAssignments(taskAssignments, taskById, profileIds, memberPairs),
      this.checkProjectDates(projects),
      this.checkTaskEnums(tasks),
      this.checkActivityLogs(activityLogs, projectIds, taskIds, profileIds),
      this.checkIntegrationMappings(integrationMappings, taskIds, profileIds),
    ];

    const issueCounts = Object.fromEntries(
      checks.map((check) => [check.id, check.issueCount]),
    );
    const criticalIssues = checks
      .filter((check) => check.severity === 'critical')
      .reduce((sum, check) => sum + check.issueCount, 0);
    const warningIssues = checks
      .filter((check) => check.severity === 'warning')
      .reduce((sum, check) => sum + check.issueCount, 0);
    const status: IntegrityStatus = criticalIssues > 0
      ? 'critical'
      : warningIssues > 0
        ? 'warning'
        : 'healthy';
    const score = Math.max(0, 100 - criticalIssues * 12 - warningIssues * 5);

    return {
      status,
      score,
      checkedAt: new Date().toISOString(),
      totals: {
        projects: projects.length,
        tasks: tasks.length,
        users: profiles.length,
        projectMembers: projectMembers.length,
        taskAssignments: taskAssignments.length,
        activityLogs: activityLogs.length,
        integrationMappings: integrationMappings.length,
      },
      issueCounts,
      checks,
      latestSnapshot,
    };
  }

  async createSnapshot(userId: string, notes?: string): Promise<IntegritySnapshot> {
    const report = await this.getReport();
    const { data, error } = await this.supabase
      .getClient()
      .from('data_integrity_snapshots')
      .insert({
        status: report.status,
        score: report.score,
        table_counts: report.totals,
        issue_counts: report.issueCounts,
        notes: notes?.trim() || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error || !data) {
      if (error && this.isMissingTableError(error)) {
        throw new BadRequestException(
          'Data integrity checkpoints table is missing. Apply create_data_integrity_snapshots.sql before saving checkpoints.',
        );
      }
      throw new BadRequestException(error?.message ?? 'Unable to create integrity checkpoint');
    }

    return data as IntegritySnapshot;
  }

  async listSnapshots(limit = 10): Promise<IntegritySnapshot[]> {
    const normalizedLimit = Math.min(50, Math.max(1, limit));
    const { data, error } = await this.supabase
      .getClient()
      .from('data_integrity_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(normalizedLimit);

    if (error && this.isMissingTableError(error)) {
      return [];
    }

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as IntegritySnapshot[];
  }

  private async getLatestSnapshot(): Promise<IntegritySnapshot | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('data_integrity_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return null;
    }

    return (data?.[0] as IntegritySnapshot | undefined) ?? null;
  }

  private isMissingTableError(error: { code?: string; message?: string }): boolean {
    return error.code === '42P01'
      || error.message?.toLowerCase().includes('does not exist') === true;
  }

  private async selectRows<T>(table: string, columns: string): Promise<T[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from(table)
      .select(columns);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as T[];
  }

  private async selectOptionalRows<T>(table: string, columns: string): Promise<T[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from(table)
      .select(columns);

    if (error) {
      return [];
    }

    return (data ?? []) as T[];
  }

  private makeCheck(
    config: Omit<IntegrityCheck, 'status' | 'issueCount' | 'details'>,
    details: string[],
  ): IntegrityCheck {
    return {
      ...config,
      status: details.length > 0 ? config.severity : 'ok',
      issueCount: details.length,
      details: details.slice(0, 6),
    };
  }

  private checkProjectMembers(
    members: ProjectMemberRow[],
    projectIds: Set<string>,
    profileIds: Set<string>,
  ): IntegrityCheck {
    const issues = members.flatMap((member) => {
      const rowIssues: string[] = [];
      if (!member.project_id || !projectIds.has(member.project_id)) {
        rowIssues.push(`Membership ${member.id} points to a missing project.`);
      }
      if (!member.user_id || !profileIds.has(member.user_id)) {
        rowIssues.push(`Membership ${member.id} points to a missing user.`);
      }
      return rowIssues;
    });

    return this.makeCheck(
      {
        id: 'project_members',
        label: 'Project membership references',
        description: 'Every project membership should point to an existing project and user.',
        severity: 'critical',
        inspectedCount: members.length,
        action: 'Remove orphaned memberships or restore the missing project/user record before changing access.',
      },
      issues,
    );
  }

  private checkTasks(
    tasks: TaskRow[],
    projectIds: Set<string>,
    profileIds: Set<string>,
  ): IntegrityCheck {
    const issues = tasks.flatMap((task) => {
      const rowIssues: string[] = [];
      if (task.project_id && !projectIds.has(task.project_id)) {
        rowIssues.push(`Task "${task.title ?? task.id}" points to a missing project.`);
      }
      if (task.created_by && !profileIds.has(task.created_by)) {
        rowIssues.push(`Task "${task.title ?? task.id}" was created by a missing user.`);
      }
      if (task.assigned_to && !profileIds.has(task.assigned_to)) {
        rowIssues.push(`Task "${task.title ?? task.id}" is assigned to a missing user.`);
      }
      return rowIssues;
    });

    return this.makeCheck(
      {
        id: 'tasks',
        label: 'Task ownership references',
        description: 'Tasks keep valid project, creator, and assignee references.',
        severity: 'critical',
        inspectedCount: tasks.length,
        action: 'Reassign affected tasks or restore the missing project/user record.',
      },
      issues,
    );
  }

  private checkTaskAssignments(
    assignments: TaskAssignmentRow[],
    taskById: Map<string, TaskRow>,
    profileIds: Set<string>,
    memberPairs: Set<string>,
  ): IntegrityCheck {
    const issues = assignments.flatMap((assignment) => {
      const rowIssues: string[] = [];
      const task = assignment.task_id ? taskById.get(assignment.task_id) : undefined;

      if (!assignment.task_id || !task) {
        rowIssues.push(`Assignment for task ${assignment.task_id ?? 'unknown'} points to a missing task.`);
      }
      if (!assignment.user_id || !profileIds.has(assignment.user_id)) {
        rowIssues.push(`Assignment for task ${assignment.task_id ?? 'unknown'} points to a missing user.`);
      }
      if (task?.project_id && assignment.user_id && !memberPairs.has(`${task.project_id}:${assignment.user_id}`)) {
        rowIssues.push(`Assignment for task "${task.title ?? task.id}" uses a user outside the project.`);
      }
      if (task && assignment.user_id && task.assigned_to && task.assigned_to !== assignment.user_id) {
        rowIssues.push(`Assignment table and task row disagree for "${task.title ?? task.id}".`);
      }

      return rowIssues;
    });

    return this.makeCheck(
      {
        id: 'task_assignments',
        label: 'Task assignment consistency',
        description: 'Assignment rows should match task rows and project membership.',
        severity: 'critical',
        inspectedCount: assignments.length,
        action: 'Sync task assignment rows with the task assignee and project membership.',
      },
      issues,
    );
  }

  private checkProjectDates(projects: ProjectRow[]): IntegrityCheck {
    const issues = projects
      .filter((project) => project.start_date && project.due_date && project.due_date < project.start_date)
      .map((project) => `Project "${project.name ?? project.id}" has a due date before its start date.`);

    return this.makeCheck(
      {
        id: 'project_dates',
        label: 'Project date ranges',
        description: 'Project due dates should not be earlier than start dates.',
        severity: 'warning',
        inspectedCount: projects.length,
        action: 'Correct the project date range before scheduling dependent work.',
      },
      issues,
    );
  }

  private checkTaskEnums(tasks: TaskRow[]): IntegrityCheck {
    const validStatuses = new Set(['todo', 'in_progress', 'in review', 'done', 'completed']);
    const validPriorities = new Set(['low', 'medium', 'high']);
    const issues = tasks.flatMap((task) => {
      const rowIssues: string[] = [];
      const status = task.status?.trim().toLowerCase() ?? '';
      const priority = task.priority?.trim().toLowerCase() ?? '';

      if (!validStatuses.has(status)) {
        rowIssues.push(`Task "${task.title ?? task.id}" has unsupported status "${task.status ?? 'empty'}".`);
      }
      if (!validPriorities.has(priority)) {
        rowIssues.push(`Task "${task.title ?? task.id}" has unsupported priority "${task.priority ?? 'empty'}".`);
      }

      return rowIssues;
    });

    return this.makeCheck(
      {
        id: 'task_values',
        label: 'Task status and priority values',
        description: 'Tasks should use values that the UI and API understand.',
        severity: 'warning',
        inspectedCount: tasks.length,
        action: 'Normalize unsupported statuses or priorities before they reach the board views.',
      },
      issues,
    );
  }

  private checkActivityLogs(
    logs: ActivityLogRow[],
    projectIds: Set<string>,
    taskIds: Set<string>,
    profileIds: Set<string>,
  ): IntegrityCheck {
    const issues = logs.flatMap((log) => {
      const rowIssues: string[] = [];
      if (log.user_id && !profileIds.has(log.user_id)) {
        rowIssues.push(`Activity ${log.id} points to a missing user.`);
      }
      if (log.project_id && !projectIds.has(log.project_id)) {
        rowIssues.push(`Activity ${log.id} points to a missing project.`);
      }
      if (log.entity_type === 'task' && log.entity_id && !taskIds.has(log.entity_id)) {
        rowIssues.push(`Activity ${log.id} points to a missing task.`);
      }
      if (log.entity_type === 'project' && log.entity_id && !projectIds.has(log.entity_id)) {
        rowIssues.push(`Activity ${log.id} points to a missing project entity.`);
      }
      return rowIssues;
    });

    return this.makeCheck(
      {
        id: 'activity_logs',
        label: 'Activity audit trail references',
        description: 'Audit entries should preserve traceability to valid users and records.',
        severity: 'warning',
        inspectedCount: logs.length,
        action: 'Keep audit entries, but mark or backfill missing context for reliable investigations.',
      },
      issues,
    );
  }

  private checkIntegrationMappings(
    mappings: GoogleCalendarTaskEventRow[],
    taskIds: Set<string>,
    profileIds: Set<string>,
  ): IntegrityCheck {
    const issues = mappings.flatMap((mapping) => {
      const rowIssues: string[] = [];
      if (!mapping.task_id || !taskIds.has(mapping.task_id)) {
        rowIssues.push(`Google Calendar mapping ${mapping.google_event_id ?? 'unknown'} points to a missing task.`);
      }
      if (!mapping.user_id || !profileIds.has(mapping.user_id)) {
        rowIssues.push(`Google Calendar mapping ${mapping.google_event_id ?? 'unknown'} points to a missing user.`);
      }
      return rowIssues;
    });

    return this.makeCheck(
      {
        id: 'integration_mappings',
        label: 'Integration mapping references',
        description: 'External sync mappings should point to valid Origin records.',
        severity: 'warning',
        inspectedCount: mappings.length,
        action: 'Disconnect stale external mappings or run the integration backfill after records are restored.',
      },
      issues,
    );
  }
}
