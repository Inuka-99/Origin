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
import { type Paginated, parsePagination } from '../common/pagination';

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
const PROJECT_MEMBER_ROLES = [
  'Admin',
  'Project Manager',
  'Team Lead',
  'Developer',
  'Designer',
  'Tester',
] as const;

type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
type ProjectStatus = (typeof PROJECT_STATUSES)[number];
type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

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
  role: ProjectMemberRole;
  joined_at: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_creator: boolean;
}

export interface ProjectMemberCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AddProjectMemberDto {
  user_id?: string;
  email?: string;
  role?: ProjectMemberRole;
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

  /**
   * List all projects the user is a member of. Admins see all projects.
   *
   * Pagination is now mandatory at the data layer to prevent the
   * "return every project in the database" footgun that existed
   * before. Callers that don't pass page/limit get the first page
   * with the default size.
   */
  async listForUser(
    userId: string,
    userRole: string,
    rawPage?: string | number,
    rawLimit?: string | number,
    rawSearch?: string,
  ): Promise<Paginated<Project>> {
    const client = this.supabase.getClient();
    const pagination = parsePagination(rawPage, rawLimit);
    const search = rawSearch?.trim();

    const applyProjectSearch = (query: any) => {
      if (!search) return query;
      const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
      const pattern = `%${escaped}%`;
      return query.or(
        `name.ilike.${pattern},description.ilike.${pattern},department.ilike.${pattern}`,
      );
    };

    if (userRole === 'admin') {
      const baseQuery = client
        .from('projects')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      const { data, error, count } = await applyProjectSearch(baseQuery)
        .range(pagination.from, pagination.to);

      if (error) throw new BadRequestException(error.message);
      const projects = (data ?? []).map((project: any) => ({
        ...project,
        user_role: 'admin',
      })) as Project[];

      return {
        data: projects,
        total: count ?? 0,
        page: pagination.page,
        limit: pagination.limit,
      };
    }

    // Regular members see only projects they belong to.
    // We fetch all the user's memberships first (one row per
    // project) — bounded by the realistic per-user project count —
    // then page over the projects table itself.
    const { data: memberships } = await client
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', userId);

    const projectIds = (memberships ?? []).map((m) => m.project_id);
    if (projectIds.length === 0) {
      return { data: [], total: 0, page: pagination.page, limit: pagination.limit };
    }

    const baseQuery = client
      .from('projects')
      .select('*', { count: 'exact' })
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    const { data, error, count } = await applyProjectSearch(baseQuery)
      .range(pagination.from, pagination.to);

    if (error) throw new BadRequestException(error.message);

    const projectsWithRoles = (data ?? []).map((project: any) => {
      const membership = memberships?.find((m) => m.project_id === project.id);
      return { ...project, user_role: membership?.role || null };
    });

    return {
      data: projectsWithRoles as Project[],
      total: count ?? 0,
      page: pagination.page,
      limit: pagination.limit,
    };
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

    const project = await this.getById(projectId);

    const { data, error } = await this.supabase
      .getClient()
      .from('project_members')
      .select('*, profiles(full_name, email, avatar_url)')
      .eq('project_id', projectId);

    if (error) throw new BadRequestException(error.message);
    return this.mapMemberRows(data ?? [], project.created_by);
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

  /**
   * Search profiles that aren't already members of the project.
   *
   * The previous implementation pulled the entire profiles table
   * into memory and filtered with String.includes — fine for a
   * dev workspace but it falls over the moment the org has a few
   * thousand users. We now:
   *
   *   1. Push the text filter into Postgres via `or(ilike, ilike)`.
   *      The trigram indexes added by the scalability migration
   *      make those ILIKE patterns index-backed.
   *   2. Cap the SQL result at a small constant. The candidate
   *      picker only renders 20 suggestions; even with two passes
   *      to drop existing members we never need more than ~50.
   *   3. Fetch existing members separately and filter the SQL
   *      result in JS — small set, cheap operation.
   */
  async searchMemberCandidates(
    projectId: string,
    query: string | undefined,
    actingUserId: string,
    globalRole: string,
  ): Promise<ProjectMemberCandidate[]> {
    await this.assertProjectAccess(projectId, actingUserId, globalRole);

    const client = this.supabase.getClient();
    const search = query?.trim();

    // Pull existing members first so we can subtract them from the
    // candidate list. The project membership table is small per
    // project (typically <100 rows), so this is fine.
    const { data: members, error: membersError } = await client
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);
    if (membersError) throw new BadRequestException(membersError.message);
    const existingMemberIds = new Set(
      (members ?? []).map((member) => member.user_id as string),
    );

    // Build the profile query with DB-side filtering. We over-fetch
    // a little (50) to leave room for the in-memory membership
    // filter to drop entries before we slice down to 20.
    const FETCH_CAP = 50;
    const RETURN_CAP = 20;

    let profileQuery = client
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .order('full_name', { ascending: true })
      .limit(FETCH_CAP);

    if (search) {
      const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
      const pattern = `%${escaped}%`;
      profileQuery = profileQuery.or(
        `full_name.ilike.${pattern},email.ilike.${pattern}`,
      );
    }

    const { data: profiles, error: profilesError } = await profileQuery;
    if (profilesError) throw new BadRequestException(profilesError.message);

    return (profiles ?? [])
      .filter((profile) => !existingMemberIds.has(profile.id as string))
      .slice(0, RETURN_CAP)
      .map((profile) => ({
        id: profile.id as string,
        full_name: (profile.full_name as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
        avatar_url: (profile.avatar_url as string | null) ?? null,
      }));
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

    const normalizedRole = String(data?.role ?? '').trim().toLowerCase();

    if (!data || (normalizedRole !== 'admin')) {
      throw new ForbiddenException('Only project admins can perform this action');
    }
  }

  private async resolveMemberId(dto: AddProjectMemberDto): Promise<string> {
    const userId = dto.user_id?.trim();
    if (userId) {
      return userId;
    }

    const email = dto.email?.trim();
    if (!email) {
      throw new BadRequestException('Select an existing user or enter an email address');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const match = data?.[0];
    if (!match?.id) {
      throw new BadRequestException(
        'No existing user matches that email. Pending invitations are not available yet.',
      );
    }

    return match.id as string;
  }

  private normalizeMemberRole(role?: string): ProjectMemberRole {
    if (!role) {
      return 'Developer';
    }

    const normalized = role.trim().toLowerCase();
    if (normalized === 'admin') {
      return 'Admin';
    }

    if (normalized === 'member') {
      return 'Developer';
    }

    const match = PROJECT_MEMBER_ROLES.find(
      (value) => value.toLowerCase() === normalized,
    );

    if (!match) {
      throw new BadRequestException(`Invalid project member role: ${role}`);
    }

    return match;
  }

  private async getMemberByUserId(
    projectId: string,
    memberId: string,
    createdBy: string | null,
  ): Promise<ProjectMember> {
    const { data, error } = await this.supabase
      .getClient()
      .from('project_members')
      .select('*, profiles(full_name, email, avatar_url)')
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Project member not found');
    }

    return this.mapMemberRows([data], createdBy)[0];
  }

  private mapMemberRows(rows: any[], createdBy: string | null): ProjectMember[] {
    return rows
      .map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const isCreator = Boolean(createdBy && row.user_id === createdBy);

        return {
          id: String(row.id),
          project_id: String(row.project_id),
          user_id: String(row.user_id),
          role: isCreator ? 'Admin' : this.normalizeMemberRole(String(row.role ?? 'Developer')),
          joined_at: String(row.joined_at),
          full_name: (profile?.full_name as string | null) ?? null,
          email: (profile?.email as string | null) ?? null,
          avatar_url: (profile?.avatar_url as string | null) ?? null,
          is_creator: isCreator,
        };
      })
      .sort((left, right) => {
        if (left.is_creator !== right.is_creator) {
          return left.is_creator ? -1 : 1;
        }

        return left.full_name?.localeCompare(right.full_name ?? '') ?? 0;
      });
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
