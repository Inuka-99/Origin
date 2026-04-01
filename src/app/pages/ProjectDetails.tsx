import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronRight, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
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
import type { Project } from '../lib/projects';

interface EditProjectFormState {
  name: string;
  description: string;
}

type EditProjectFormErrors = Partial<Record<'name', string>>;

function createEditProjectForm(project: Project | null): EditProjectFormState {
  return {
    name: project?.name ?? '',
    description: project?.description ?? '',
  };
}

function validateEditProjectForm(form: EditProjectFormState): EditProjectFormErrors {
  const errors: EditProjectFormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Project name is required.';
  }

  return errors;
}

export function ProjectDetails() {
  const { projectId = '' } = useParams();
  const api = useApiClient();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProjectFormState>(createEditProjectForm(null));
  const [editErrors, setEditErrors] = useState<EditProjectFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<Project>(`/projects/${projectId}`);
        if (!cancelled) {
          setProject(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load project.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [api, projectId]);

  const openEditModal = () => {
    setEditForm(createEditProjectForm(project));
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) {
      return;
    }

    setIsEditModalOpen(false);
  };

  const setEditField = <K extends keyof EditProjectFormState>(
    field: K,
    value: EditProjectFormState[K],
  ) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleEditSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const validationErrors = validateEditProjectForm(editForm);
    setEditErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedProject = await api.patch<Project>(`/projects/${projectId}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      });
      setProject(updatedProject);
      setIsEditModalOpen(false);
      toast.success('Project updated successfully.');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to update project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/projects/${projectId}`);
      setIsDeleteDialogOpen(false);
      toast.success('Project deleted successfully.');
      navigate('/projects');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Unable to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      <main className="ml-56 pt-16 p-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link to="/projects" className="hover:text-[#204EA7] transition-colors">Projects</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{project?.name ?? 'Project Details'}</span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-gray-600">
            Loading project details...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Project unavailable
            </h1>
            <p className="text-red-600">{error}</p>
          </div>
        ) : project ? (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-950 mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {project.name}
                  </h1>
                  <p className="max-w-3xl text-gray-600">
                    {project.description || 'No description has been added for this project yet.'}
                  </p>
                </div>
                <div className="hidden lg:flex size-16 items-center justify-center rounded-2xl bg-[#204EA7]/8 text-[#204EA7]">
                  <FolderKanban className="w-8 h-8" />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openEditModal}
                  disabled={isSaving || isDeleting}
                  className="mr-3"
                >
                  Edit Project
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isSaving || isDeleting}
                >
                  Delete Project
                </Button>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Details
                </h2>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Created By</p>
                    <p className="font-medium text-gray-900">{project.created_by || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Created</p>
                    <p className="font-medium text-gray-900">{new Date(project.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Last Updated</p>
                    <p className="font-medium text-gray-900">{new Date(project.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => (open ? openEditModal() : closeEditModal())}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl text-gray-950">
                Edit Project
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Update the project details and save your changes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.name}
                    onChange={(event) => setEditField('name', event.target.value)}
                    placeholder="Enter a clear project name"
                    aria-invalid={Boolean(editErrors.name)}
                    className="h-11"
                  />
                  {editErrors.name ? <p className="mt-1 text-sm text-red-600">{editErrors.name}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(event) => setEditField('description', event.target.value)}
                    placeholder="Add project context or a short summary"
                    className="min-h-28"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={closeEditModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-[#204EA7] hover:bg-[#1a3d8a] text-white">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteProject();
              }}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
