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
import { useApiClient } from '../lib/api-client';
import {
  type CreateProjectPayload,
  type Project,
} from '../lib/projects';

interface ProjectFormState {
  name: string;
  description: string;
}

type FormErrors = Partial<Record<'name', string>>;

function createInitialFormState(): ProjectFormState {
  return {
    name: '',
    description: '',
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

  return errors;
}

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
        const response = await api.get<Project[]>('/projects');
        if (!cancelled) {
          setProjects(response);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load projects.');
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
  }, [api]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      [
        project.name,
        project.description ?? '',
      ].some((value) => value.toLowerCase().includes(query)),
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
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      <main className="ml-56 pt-16 p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              Projects
            </h1>
            <p className="text-gray-600">Manage and track all active projects</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
            />
          </div>

          <button type="button" className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 cursor-not-allowed">
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-4 h-4" />
          </button>

          <button type="button" className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 cursor-not-allowed">
            Sort
            <ChevronDown className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
            >
              <Grid3x3 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
            >
              <List className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg p-12 shadow-sm text-gray-600">Loading projects...</div>
        ) : loadError ? (
          <div className="bg-white rounded-lg p-12 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Projects are unavailable
            </h3>
            <p className="text-red-600">{loadError}</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Grid3x3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              No projects found
            </h3>
            <p className="text-gray-600 mb-6">Create your first project to start tracking work</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-left bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-[#204EA7]/20"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-[#1a1a1a]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500">Created by {project.created_by || 'Unknown user'}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 min-h-10">
                  {project.description || 'No description has been added yet.'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {formatCreated(project.updated_at)}
                  </span>
                  <span>Created {formatCreated(project.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Project</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Description</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Created By</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Created</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{project.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-sm truncate">{project.description || 'No description'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{project.created_by || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatCreated(project.created_at)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatCreated(project.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : closeCreateModal())}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl text-gray-950">
                Create Project
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Capture the essentials now and refine the project after creation.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    placeholder="Enter a clear project name"
                    aria-invalid={Boolean(errors.name)}
                    className="h-11"
                  />
                  {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                    placeholder="Add project context or a short summary"
                    className="min-h-28"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={closeCreateModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#204EA7] hover:bg-[#1a3d8a] text-white">
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
