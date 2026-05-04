import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar,
  ChevronDown,
  Filter,
  Grid3x3,
  List,
  Plus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ProjectPrioritySelect } from '../components/ProjectPrioritySelect';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { type PaginatedList, unwrapList, useApiClient } from '../lib/api-client';
import {
  type CreateProjectPayload,
  getProjectPriorityBadgeClasses,
  type Project,
  type ProjectPriority,
  type ProjectStatus,
} from '../lib/projects';

const PROJECT_STATUSES: ProjectStatus[] = [
  'Planning',
  'Active',
  'In Progress',
  'Review',
  'On Hold',
  'Completed',
  'Archived',
];

interface ProjectFormState {
  name: string;
  description: string;
  start_date: string;
  due_date: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  department: string;
  tags: string;
}

type FormErrors = Partial<Record<'name' | 'priority' | 'department' | 'due_date', string>>;

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialFormState(): ProjectFormState {
  return {
    name: '',
    description: '',
    start_date: getTodayDateString(),
    due_date: '',
    priority: 'Medium',
    status: 'Planning',
    department: '',
    tags: '',
  };
}

function formatCreated(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function validateForm(form: ProjectFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Project name is required.';
  }

  if (!form.priority) {
    errors.priority = 'Priority is required.';
  }

  if (!form.department.trim()) {
    errors.department = 'Department is required.';
  }

  if (form.due_date && form.due_date < form.start_date) {
    errors.due_date = 'Due date cannot be earlier than start date.';
  }

  return errors;
}

const formControlClassName =
  'flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm shadow-sm outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const textAreaClassName =
  'min-h-24 rounded-md border border-border-strong bg-surface shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export function Projects() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ProjectFormState>(createInitialFormState);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const params = new URLSearchParams({ limit: '200' });
        const trimmedSearch = searchQuery.trim();
        if (trimmedSearch) {
          params.set('q', trimmedSearch);
        }
        const response = await api.get<Project[] | PaginatedList<Project>>(`/projects?${params.toString()}`);
        const normalizedProjects = unwrapList(response);
        if (!cancelled) {
          setProjects(Array.isArray(normalizedProjects) ? normalizedProjects : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load projects.');
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [api, searchQuery]);

  const filteredProjects = useMemo(() => {
    const projectList = Array.isArray(projects) ? projects : [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return projectList;
    }

    return projectList.filter((project) =>
      [project.name, project.description ?? ''].some((value) => value.toLowerCase().includes(query)),
    );
  }, [projects, searchQuery]);

  const openCreateModal = () => {
    setForm(createInitialFormState());
    setErrors({});
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
  };

  const setField = <K extends keyof ProjectFormState>(field: K, value: ProjectFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload: CreateProjectPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      start_date: form.start_date,
      due_date: form.due_date || undefined,
      priority: form.priority,
      status: form.status,
      department: form.department.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      setIsSubmitting(true);
      const createdProject = await api.post<Project>('/projects', payload);
      setProjects((current) => [createdProject, ...current]);
      setIsModalOpen(false);
      toast.success('Project created successfully.');
      navigate(`/projects/${createdProject.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      <main
        className="px-8 pb-8 pt-20 transition-[margin] duration-200 ease-out"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="mb-10 flex items-center justify-between gap-6">
          <div className="pt-1">
            <h1
              className="mb-3 text-3xl font-semibold text-text-primary"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Projects
            </h1>
            <p className="text-text-secondary">Manage and track all active projects</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-1 flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-5 w-5" />
            Create Project
          </button>
        </div>

        <div className="mb-6 flex items-center gap-4 rounded-lg bg-surface p-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-sunken py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="button"
            className="cursor-not-allowed rounded-lg border border-border-subtle bg-surface-sunken px-4 py-2.5 text-sm font-medium text-text-tertiary"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            className="cursor-not-allowed rounded-lg border border-border-subtle bg-surface-sunken px-4 py-2.5 text-sm font-medium text-text-tertiary"
          >
            <span className="flex items-center gap-2">
              Sort
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>

          <div className="flex items-center gap-1 rounded-lg bg-surface-sunken p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded p-2 ${viewMode === 'grid' ? 'bg-surface shadow-sm' : 'hover:bg-surface-hover'}`}
            >
              <Grid3x3 className="h-4 w-4 text-text-secondary" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded p-2 ${viewMode === 'list' ? 'bg-surface shadow-sm' : 'hover:bg-surface-hover'}`}
            >
              <List className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg bg-surface p-12 text-text-secondary shadow-sm">Loading projects...</div>
        ) : loadError ? (
          <div className="rounded-lg bg-surface p-12 shadow-sm">
            <h3
              className="mb-2 text-lg font-semibold text-text-primary"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Projects are unavailable
            </h3>
            <p className="text-red-600">{loadError}</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-lg bg-surface p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-hover">
              <Grid3x3 className="h-8 w-8 text-text-tertiary" />
            </div>
            <h3
              className="mb-2 text-lg font-semibold text-text-primary"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              No projects found
            </h3>
            <p className="mb-6 text-text-secondary">Create your first project to start tracking work</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-5 w-5" />
              Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="rounded-2xl border border-transparent bg-surface p-6 text-left shadow-sm transition-shadow hover:border-accent/20 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className="mb-1 text-lg font-semibold text-text-primary"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {project.name}
                    </h3>
                    <p className="text-xs text-text-tertiary">
                      Created by {project.created_by || 'Unknown user'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getProjectPriorityBadgeClasses(project.priority)}`}
                  >
                    {project.priority}
                  </span>
                </div>

                <p className="mb-4 min-h-10 text-sm text-text-secondary">
                  {project.description || 'No description has been added yet.'}
                </p>

                <div className="flex items-center justify-between border-t border-divider pt-4 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Updated {formatCreated(project.updated_at)}
                  </span>
                  <span>Created {formatCreated(project.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border-subtle bg-surface-sunken">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Project</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Created By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Priority</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Created</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="cursor-pointer hover:bg-surface-sunken"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-text-primary">{project.name}</div>
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-sm text-text-secondary">
                        {project.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {project.created_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getProjectPriorityBadgeClasses(project.priority)}`}
                        >
                          {project.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatCreated(project.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatCreated(project.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : closeCreateModal())}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,58rem)] max-w-5xl overflow-hidden border-0 p-0 shadow-2xl">
          <div className="max-h-[90vh] overflow-y-auto bg-surface">
            <DialogHeader className="border-b border-divider px-6 pb-3 pt-5">
              <DialogTitle
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                className="text-2xl text-gray-950"
              >
                Create Project
              </DialogTitle>
              <DialogDescription className="text-text-secondary">
                Capture the essentials now and refine the project after creation.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    placeholder="Enter a clear project name"
                    aria-invalid={Boolean(errors.name)}
                    className={formControlClassName}
                  />
                  {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                    placeholder="Add project context or a short summary"
                    className={textAreaClassName}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Start Date</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => setField('start_date', event.target.value)}
                    className={formControlClassName}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Due Date</label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(event) => setField('due_date', event.target.value)}
                    aria-invalid={Boolean(errors.due_date)}
                    className={formControlClassName}
                  />
                  {errors.due_date ? <p className="mt-1 text-sm text-red-600">{errors.due_date}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <ProjectPrioritySelect
                    value={form.priority}
                    onChange={(value) => setField('priority', value)}
                    className={Boolean(errors.priority) ? 'border-red-500 ring-red-200' : undefined}
                  />
                  {errors.priority ? <p className="mt-1 text-sm text-red-600">{errors.priority}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setField('status', event.target.value as ProjectStatus)}
                    className={formControlClassName}
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.department}
                    onChange={(event) => setField('department', event.target.value)}
                    placeholder="Enter the owning team or department"
                    aria-invalid={Boolean(errors.department)}
                    className={formControlClassName}
                  />
                  {errors.department ? <p className="mt-1 text-sm text-red-600">{errors.department}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Tags</label>
                  <Input
                    value={form.tags}
                    onChange={(event) => setField('tags', event.target.value)}
                    placeholder="Enter tags separated by commas"
                    className={formControlClassName}
                  />
                </div>
              </div>

              <DialogFooter className="border-t border-divider pt-3">
                <Button type="button" variant="outline" onClick={closeCreateModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-accent text-white hover:bg-accent-hover">
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
