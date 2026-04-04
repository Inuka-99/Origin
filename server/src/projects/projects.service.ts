/**
 * projects.service.ts
 *
 * Service layer for project CRUD operations backed by Supabase.
 * Includes project membership management for RBAC.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';
import { ActivityLogService, ActivityActions } from '../activity-log';

const PROJECT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
const PROJECT_STATUSES = [
  'Planning',
  'Active',
  'In Progress',
  'Review',
  'On Hold',
  'Completed',
  'Archived',
] as const;

type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  due_date: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  department: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_role?: 'admin' | 'member' | null; // User's role in this project
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  priority: ProjectPriority;
  status?: ProjectStatus;
  department: string;
  tags?: string[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string | null;
  start_date?: string;
  due_date?: string | null;
  priority?: ProjectPriority;
  status?: ProjectStatus;
  department?: string;
  tags?: string[];
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activityLog: ActivityLogService,
  ) {}

  /** Create a new project. The creator becomes the project admin. */
  async create(dto: CreateProjectDto, userId: string): Promise<Project> {
    const client = this.supabase.getClient();
    const payload = this.normalizeProjectPayload(dto, { requireName: true, requirePriority: true, requireDepartment: true });

    // Create the project
    const { data: project, error } = await client
      .from('projects')
      .insert({
        ...payload,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Add creator as project admin
    const { error: memberError } = await client.from('project_members').insert({
      project_id: project.id,
      user_id: userId,
      role: 'admin',
    });

    if (memberError) {
      await client.from('projects').delete().eq('id', project.id);
      throw new BadRequestException(memberError.message);
    }

    return project as Project;
  }

  /** List all projects the user is a member of. Admins see all projects. */
  async listForUser(userId: string, userRole: string): Promise<Project[]> {
    const client = this.supabase.getClient();

    if (userRole === 'admin') {
      // Global admins see all projects
      const { data, error } = await client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new BadRequestException(error.message);
      // For global admins, they have admin role on all projects
      return (data ?? []).map(project => ({ ...project, user_role: 'admin' })) as Project[];
    }

    // Regular members see only projects they belong to
    const { data: memberships } = await client
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', userId);

    const projectIds = (memberships ?? []).map((m) => m.project_id);
    if (projectIds.length === 0) return [];

    const { data, error } = await client
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    // Add user role to each project
    const projectsWithRoles = (data ?? []).map(project => {
      const membership = memberships?.find(m => m.project_id === project.id);
      return { ...project, user_role: membership?.role || null };
    });

    return projectsWithRoles as Project[];
  }

  /** Get a single project by ID. */
  async getById(id: string): Promise<Project> {
    const { data, error } = await this.supabase
      .getClient()
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Project not found');
    return data as Project;
  }

  /** Update a project. Only project admins or global admins can update. */
  async update(
    id: string,
    dto: UpdateProjectDto,
    userId: string,
    globalRole: string,
  ): Promise<Project> {
    await this.assertProjectAccess(id, userId, globalRole);

    const updatePayload = this.normalizeProjectPayload(dto);

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException('No valid project fields were provided');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('projects')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Project not found');

    // Log activity
    await this.activityLog.log({
      user_id: userId,
      action: ActivityActions.PROJECT_UPDATED,
      entity_type: 'project',
      entity_id: id,
      description: `Updated project "${data.name}"`,
      metadata: { name: data.name, changes: dto },
      project_id: id,
    });

    return data as Project;
  }

  /** Delete a project. Only project admins or global admins can delete. */
  async delete(id: string, userId: string, globalRole: string): Promise<void> {
    await this.assertProjectAccess(id, userId, globalRole);

    // Fetch project name before deleting for the log
    const project = await this.getById(id);

    const { error } = await this.supabase
      .getClient()
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Log activity
    await this.activityLog.log({
      user_id: userId,
      action: ActivityActions.PROJECT_DELETED,
      entity_type: 'project',
      entity_id: id,
      description: `Deleted project "${project.name}"`,
      metadata: { name: project.name },
    });
  }

  /** List members of a project. Only project members or admins can view. */
  async listMembers(projectId: string, userId: string, globalRole: string): Promise<ProjectMember[]> {
    // Check if user is a member or admin
    if (globalRole !== 'admin') {
      const { data: membership } = await this.supabase
        .getClient()
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        throw new ForbiddenException('You are not a member of this project');
      }
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('project_members')
      .select('*, profiles(full_name, email, avatar_url)')
      .eq('project_id', projectId);

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ProjectMember[];
  }

  /** Add a member to a project. Only project admins or global admins can add members. */
  async addMember(
    projectId: string,
    memberId: string,
    role: 'admin' | 'member' = 'member',
    userId: string,
    globalRole: string,
  ): Promise<ProjectMember> {
    await this.assertProjectAccess(projectId, userId, globalRole);

    const { data, error } = await this.supabase
      .getClient()
      .from('project_members')
      .insert({ project_id: projectId, user_id: memberId, role })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Log activity (we don't have the caller's userId here, so we use memberId)
    await this.activityLog.log({
      user_id: memberId,
      action: ActivityActions.MEMBER_ADDED,
      entity_type: 'member',
      entity_id: memberId,
      description: `Added to project as ${role}`,
      metadata: { role },
      project_id: projectId,
    });

    return data as ProjectMember;
  }

  /** Remove a member from a project. Only project admins or global admins can remove members. */
  async removeMember(
    projectId: string,
    memberId: string,
    userId: string,
    globalRole: string,
  ): Promise<void> {
    await this.assertProjectAccess(projectId, userId, globalRole);

    const { error } = await this.supabase
      .getClient()
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId);

    if (error) throw new BadRequestException(error.message);

    // If this was the last project member, delete the orphaned project too.
    const { count, error: countError } = await this.supabase
      .getClient()
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (countError) throw new BadRequestException(countError.message);
    if (!count) {
      const { error: projectError } = await this.supabase
        .getClient()
        .from('projects')
        .delete()
        .eq('id', projectId);
      if (projectError) throw new BadRequestException(projectError.message);
    }
  }

  /** Check if user has admin access to project. */
  private async assertProjectAccess(
    projectId: string,
    userId: string,
    globalRole: string,
  ): Promise<void> {
    // Global admins can access everything
    if (globalRole === 'admin') return;

    const { data } = await this.supabase
      .getClient()
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!data || data.role !== 'admin') {
      throw new ForbiddenException('Only project admins can perform this action');
    }
  }

  private normalizeProjectPayload(
    dto: CreateProjectDto | UpdateProjectDto,
    options: {
      requireName?: boolean;
      requirePriority?: boolean;
      requireDepartment?: boolean;
    } = {},
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if ('name' in dto || options.requireName) {
      const name = dto.name?.trim();
      if (options.requireName && !name) {
        throw new BadRequestException('Project name is required');
      }
      if (name) {
        payload.name = name;
      } else if ('name' in dto && dto.name !== undefined) {
        throw new BadRequestException('Project name is required');
      }
    }

    if ('description' in dto) {
      const description = dto.description?.trim();
      payload.description = description || null;
    }

    const startDate = this.normalizeDate(dto.start_date);
    if (startDate) {
      payload.start_date = startDate;
    } else if (options.requireName && !('start_date' in dto)) {
      payload.start_date = this.getTodayDateString();
    }

    if ('priority' in dto || options.requirePriority) {
      const priority = this.normalizePriority(dto.priority);
      if (!priority && options.requirePriority) {
        throw new BadRequestException('Project priority is required');
      }
      if (priority) {
        payload.priority = priority;
      }
    }

    if ('status' in dto) {
      const status = this.normalizeStatus(dto.status);
      if (status) {
        payload.status = status;
      }
    } else if (options.requireName) {
      payload.status = 'Planning';
    }

    if ('department' in dto || options.requireDepartment) {
      const department = dto.department?.trim();
      if (!department && options.requireDepartment) {
        throw new BadRequestException('Project department is required');
      }
      if (department) {
        payload.department = department;
      }
    }

    if ('tags' in dto) {
      payload.tags = this.normalizeTags(dto.tags);
    } else if (options.requireName) {
      payload.tags = [];
    }

    if ('due_date' in dto) {
      const dueDate = this.normalizeDate(dto.due_date ?? undefined);
      payload.due_date = dueDate ?? null;
    }

    const effectiveStartDate = (payload.start_date as string | undefined)
      ?? this.normalizeDate(dto.start_date)
      ?? (options.requireName ? this.getTodayDateString() : undefined);
    const effectiveDueDate = payload.due_date as string | null | undefined;

    if (effectiveStartDate && effectiveDueDate && effectiveDueDate < effectiveStartDate) {
      throw new BadRequestException('Due date cannot be earlier than start date');
    }

    return payload;
  }

  private normalizePriority(priority?: string): ProjectPriority | undefined {
    if (priority === undefined) {
      return undefined;
    }

    const normalized = priority.trim().toLowerCase();
    const match = PROJECT_PRIORITIES.find(
      (value) => value.toLowerCase() === normalized,
    );

    if (!match) {
      throw new BadRequestException(`Invalid project priority: ${priority}`);
    }

    return match;
  }

  private normalizeStatus(status?: string): ProjectStatus | undefined {
    if (status === undefined) {
      return undefined;
    }

    const normalized = status.trim().toLowerCase();
    const match = PROJECT_STATUSES.find(
      (value) => value.toLowerCase() === normalized,
    );

    if (!match) {
      throw new BadRequestException(`Invalid project status: ${status}`);
    }

    return match;
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) {
      return [];
    }

    return Array.from(
      new Set(
        tags
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
  }

  private normalizeDate(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(`Invalid date value: ${value}`);
    }

    return trimmed;
  }

  private getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
