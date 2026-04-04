import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  FolderKanban,
  UserPlus,
  Users,
} from 'lucide-react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Textarea } from '../components/ui/textarea';
import { useApiClient } from '../lib/api-client';
import type {
  AddProjectMemberPayload,
  Project,
  ProjectMember,
  ProjectMemberCandidate,
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
} from '../lib/projects';

const PROJECT_PRIORITIES: ProjectPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const PROJECT_STATUSES: ProjectStatus[] = [
  'Planning',
  'Active',
  'In Progress',
  'Review',
  'On Hold',
  'Completed',
  'Archived',
];
const PROJECT_MEMBER_ROLES: ProjectMemberRole[] = [
  'Admin',
  'Project Manager',
  'Team Lead',
  'Developer',
  'Designer',
  'Tester',
];

interface EditProjectFormState {
  name: string;
  description: string;
  start_date: string;
  due_date: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  department: string;
  tags: string;
}

interface AddMemberFormState {
  user_id: string;
  email: string;
  role: ProjectMemberRole;
}

type EditProjectFormErrors = Partial<Record<'name' | 'priority' | 'department' | 'due_date', string>>;
type AddMemberFormErrors = Partial<Record<'member' | 'role', string>>;

function createEditProjectForm(project: Project | null): EditProjectFormState {
  return {
    name: project?.name ?? '',
    description: project?.description ?? '',
    start_date: project?.start_date ?? new Date().toISOString().slice(0, 10),
    due_date: project?.due_date ?? '',
    priority: project?.priority ?? 'Medium',
    status: project?.status ?? 'Planning',
    department: project?.department ?? '',
    tags: project?.tags.join(', ') ?? '',
  };
}

function createAddMemberForm(): AddMemberFormState {
  return {
    user_id: '',
    email: '',
    role: 'Developer',
  };
}

function validateEditProjectForm(form: EditProjectFormState): EditProjectFormErrors {
  const errors: EditProjectFormErrors = {};

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

function validateAddMemberForm(form: AddMemberFormState): AddMemberFormErrors {
  const errors: AddMemberFormErrors = {};

  if (!form.user_id && !form.email.trim()) {
    errors.member = 'Select an existing user or enter an email address.';
  }

  if (!form.role) {
    errors.role = 'Role is required.';
  }

  return errors;
}

function sortMembers(members: ProjectMember[]): ProjectMember[] {
  return [...members].sort((left, right) => {
    if (left.is_creator !== right.is_creator) {
      return left.is_creator ? -1 : 1;
    }

    if (left.role !== right.role) {
      if (left.role === 'Admin') {
        return -1;
      }

      if (right.role === 'Admin') {
        return 1;
      }
    }

    const leftLabel = left.full_name || left.email || left.user_id;
    const rightLabel = right.full_name || right.email || right.user_id;
    return leftLabel.localeCompare(rightLabel);
  });
}

function getMemberInitial(member: ProjectMember): string {
  const label = member.full_name || member.email || member.user_id;
  return label.charAt(0).toUpperCase();
}

function getCandidatePrimaryLabel(candidate: ProjectMemberCandidate): string {
  if (candidate.full_name?.trim()) {
    return candidate.full_name.trim();
  }

  if (candidate.email?.trim()) {
    return candidate.email.trim();
  }

  return formatReadableUserId(candidate.id);
}

function getCandidateSecondaryLabel(candidate: ProjectMemberCandidate): string {
  if (candidate.full_name?.trim() && candidate.email?.trim()) {
    return candidate.email.trim();
  }

  return formatReadableUserId(candidate.id);
}

function formatReadableUserId(value: string): string {
  if (!value) {
    return 'Unknown user';
  }

  const parts = value.split('|');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[0]} | ${parts[1].slice(0, 10)}${parts[1].length > 10 ? '...' : ''}`;
  }

  return value.length > 20 ? `${value.slice(0, 20)}...` : value;
}

const formControlClassName =
  'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-[border-color,box-shadow] hover:border-gray-400 hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const textAreaClassName =
  'min-h-24 rounded-md border border-gray-300 bg-white shadow-sm transition-[border-color,box-shadow] hover:border-gray-400 hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export function ProjectDetails() {
  const { projectId = '' } = useParams();
  const api = useApiClient();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProjectFormState>(createEditProjectForm(null));
  const [editErrors, setEditErrors] = useState<EditProjectFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<AddMemberFormState>(createAddMemberForm());
  const [addMemberErrors, setAddMemberErrors] = useState<AddMemberFormErrors>({});
  const [memberCandidates, setMemberCandidates] = useState<ProjectMemberCandidate[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ProjectMemberCandidate | null>(null);
  const [isCandidatePopoverOpen, setIsCandidatePopoverOpen] = useState(false);
  const [isCandidateLoading, setIsCandidateLoading] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectDetails() {
      try {
        setIsLoading(true);
        setError(null);
        const [projectResponse, membersResponse] = await Promise.all([
          api.get<Project>(`/projects/${projectId}`),
          api.get<ProjectMember[]>(`/projects/${projectId}/members`),
        ]);

        if (!cancelled) {
          setProject(projectResponse);
          setMembers(sortMembers(membersResponse));
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

    void loadProjectDetails();

    return () => {
      cancelled = true;
    };
  }, [api, projectId]);

  useEffect(() => {
    if (!isAddMemberModalOpen) {
      return;
    }

    let cancelled = false;

    async function loadCandidates() {
      try {
        setIsCandidateLoading(true);
        const params = new URLSearchParams();
        if (memberSearch.trim()) {
          params.set('q', memberSearch.trim());
        }

        const path = `/projects/${projectId}/member-candidates${params.size > 0 ? `?${params.toString()}` : ''}`;
        const response = await api.get<ProjectMemberCandidate[]>(path);

        if (!cancelled) {
          setMemberCandidates(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          toast.error(loadError instanceof Error ? loadError.message : 'Unable to load users.');
        }
      } finally {
        if (!cancelled) {
          setIsCandidateLoading(false);
        }
      }
    }

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [api, isAddMemberModalOpen, memberSearch, projectId]);

  const existingMemberIds = useMemo(
    () => new Set(members.map((member) => member.user_id)),
    [members],
  );
  const existingMemberEmails = useMemo(
    () =>
      new Set(
        members
          .map((member) => member.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    [members],
  );
  const filteredMemberCandidates = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();

    if (!search) {
      return memberCandidates;
    }

    return memberCandidates.filter((candidate) => {
      const fields = [
        candidate.full_name ?? '',
        candidate.email ?? '',
        candidate.id,
        formatReadableUserId(candidate.id),
      ];

      return fields.some((field) => field.toLowerCase().includes(search));
    });
  }, [memberCandidates, memberSearch]);

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

  const openAddMemberModal = () => {
    setAddMemberForm(createAddMemberForm());
    setAddMemberErrors({});
    setSelectedCandidate(null);
    setMemberSearch('');
    setIsCandidatePopoverOpen(false);
    setIsAddMemberModalOpen(true);
  };

  const closeAddMemberModal = () => {
    if (isAddingMember) {
      return;
    }

    setMemberSearch('');
    setSelectedCandidate(null);
    setIsCandidatePopoverOpen(false);
    setIsAddMemberModalOpen(false);
  };

  const setEditField = <K extends keyof EditProjectFormState>(
    field: K,
    value: EditProjectFormState[K],
  ) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const setAddMemberField = <K extends keyof AddMemberFormState>(
    field: K,
    value: AddMemberFormState[K],
  ) => {
    setAddMemberForm((current) => ({ ...current, [field]: value }));
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
        start_date: editForm.start_date,
        due_date: editForm.due_date || null,
        priority: editForm.priority,
        status: editForm.status,
        department: editForm.department.trim(),
        tags: editForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
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

  const handleAddMemberSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const validationErrors = validateAddMemberForm(addMemberForm);

    if (addMemberForm.user_id && existingMemberIds.has(addMemberForm.user_id)) {
      validationErrors.member = 'This user is already a member of the project.';
    }

    const normalizedEmail = addMemberForm.email.trim().toLowerCase();
    if (!addMemberForm.user_id && normalizedEmail && existingMemberEmails.has(normalizedEmail)) {
      validationErrors.member = 'This user is already a member of the project.';
    }

    setAddMemberErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsAddingMember(true);
      const payload: AddProjectMemberPayload = {
        role: addMemberForm.role,
        ...(addMemberForm.user_id ? { user_id: addMemberForm.user_id } : {}),
        ...(addMemberForm.email.trim() ? { email: addMemberForm.email.trim() } : {}),
      };

      const addedMember = await api.post<ProjectMember>(`/projects/${projectId}/members`, payload);
      setMembers((current) => sortMembers([
        ...current.filter((member) => member.user_id !== addedMember.user_id),
        addedMember,
      ]));
      setIsAddMemberModalOpen(false);
      toast.success('Project member added successfully.');
    } catch (addError) {
      toast.error(addError instanceof Error ? addError.message : 'Unable to add member.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    try {
      setRemovingMemberId(member.user_id);
      await api.delete(`/projects/${projectId}/members/${encodeURIComponent(member.user_id)}`);
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
      toast.success('Project member removed successfully.');
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : 'Unable to remove member.');
    } finally {
      setRemovingMemberId(null);
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

      <main className="ml-56 p-8 pt-16">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <Link to="/projects" className="transition-colors hover:text-[#204EA7]">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900">{project?.name ?? 'Project Details'}</span>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-gray-600 shadow-sm">
            Loading project details...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
            <h1
              className="mb-2 text-2xl font-semibold text-gray-900"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Project unavailable
            </h1>
            <p className="text-red-600">{error}</p>
          </div>
        ) : project ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1
                    className="mb-3 text-3xl font-semibold text-gray-950"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {project.name}
                  </h1>
                  <p className="max-w-3xl text-gray-600">
                    {project.description || 'No description has been added for this project yet.'}
                  </p>
                </div>
                <div className="hidden size-16 items-center justify-center rounded-2xl bg-[#204EA7]/8 text-[#204EA7] lg:flex">
                  <FolderKanban className="h-8 w-8" />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-gray-100 pt-6">
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

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setIsMembersExpanded((current) => !current)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl px-1 py-1 text-left transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <h2
                        className="text-lg font-semibold text-gray-900"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Team Members
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {isMembersExpanded
                          ? 'Manage the people assigned to this project.'
                          : `${members.length} member${members.length === 1 ? '' : 's'} assigned to this project.`}
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                        isMembersExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  <div className="shrink-0">
                    <Button
                      type="button"
                      onClick={openAddMemberModal}
                      className="bg-[#204EA7] text-white hover:bg-[#1a3d8a]"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Member
                    </Button>
                  </div>
                </div>

                {isMembersExpanded ? (
                  members.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                      <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="font-medium text-gray-900">No team members yet</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Add teammates to start collaborating on this project.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => {
                        const memberLabel = member.full_name || member.email || member.user_id;
                        const isRemoving = removingMemberId === member.user_id;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#204EA7]/10 text-sm font-semibold text-[#204EA7]">
                                {getMemberInitial(member)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{memberLabel}</p>
                                <p className="truncate text-sm text-gray-500">
                                  {member.email || member.user_id}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-[#204EA7]/10 px-2.5 py-1 text-xs font-medium text-[#204EA7]">
                                    {member.role}
                                  </span>
                                  {member.is_creator ? (
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                      Creator
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleRemoveMember(member)}
                              disabled={member.is_creator || isRemoving}
                              className="shrink-0"
                            >
                              {isRemoving ? 'Removing...' : 'Remove'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2
                  className="mb-4 text-lg font-semibold text-gray-900"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Details
                </h2>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="mb-1 text-gray-500">Created By</p>
                    <p className="font-medium text-gray-900">{project.created_by || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">{new Date(project.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">
                      {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Priority</p>
                    <p className="font-medium text-gray-900">{project.priority}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Status</p>
                    <p className="font-medium text-gray-900">{project.status}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Department</p>
                    <p className="font-medium text-gray-900">{project.department}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Tags</p>
                    <p className="font-medium text-gray-900">
                      {project.tags.length > 0 ? project.tags.join(', ') : 'No tags'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">{new Date(project.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-gray-500">Last Updated</p>
                    <p className="font-medium text-gray-900">{new Date(project.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => (open ? openEditModal() : closeEditModal())}>
        <DialogContent className="w-[min(92vw,58rem)] max-h-[90vh] max-w-5xl overflow-hidden border-0 p-0 shadow-2xl">
          <div className="max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="border-b border-gray-100 px-6 pb-3 pt-5">
              <DialogTitle
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                className="text-2xl text-gray-950"
              >
                Edit Project
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Update the project details and save your changes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.name}
                    onChange={(event) => setEditField('name', event.target.value)}
                    placeholder="Enter a clear project name"
                    aria-invalid={Boolean(editErrors.name)}
                    className={formControlClassName}
                  />
                  {editErrors.name ? <p className="mt-1 text-sm text-red-600">{editErrors.name}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(event) => setEditField('description', event.target.value)}
                    placeholder="Add project context or a short summary"
                    className={textAreaClassName}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Start Date</label>
                  <Input
                    type="date"
                    value={editForm.start_date}
                    onChange={(event) => setEditField('start_date', event.target.value)}
                    className={formControlClassName}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Due Date</label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(event) => setEditField('due_date', event.target.value)}
                    aria-invalid={Boolean(editErrors.due_date)}
                    className={formControlClassName}
                  />
                  {editErrors.due_date ? <p className="mt-1 text-sm text-red-600">{editErrors.due_date}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(event) => setEditField('priority', event.target.value as ProjectPriority)}
                    aria-invalid={Boolean(editErrors.priority)}
                    className={formControlClassName}
                  >
                    {PROJECT_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  {editErrors.priority ? <p className="mt-1 text-sm text-red-600">{editErrors.priority}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(event) => setEditField('status', event.target.value as ProjectStatus)}
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.department}
                    onChange={(event) => setEditField('department', event.target.value)}
                    placeholder="Enter the owning team or department"
                    aria-invalid={Boolean(editErrors.department)}
                    className={formControlClassName}
                  />
                  {editErrors.department ? (
                    <p className="mt-1 text-sm text-red-600">{editErrors.department}</p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-900">Tags</label>
                  <Input
                    value={editForm.tags}
                    onChange={(event) => setEditField('tags', event.target.value)}
                    placeholder="Enter tags separated by commas"
                    className={formControlClassName}
                  />
                </div>
              </div>

              <DialogFooter className="border-t border-gray-100 pt-3">
                <Button type="button" variant="outline" onClick={closeEditModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-[#204EA7] text-white hover:bg-[#1a3d8a]">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberModalOpen} onOpenChange={(open) => (open ? openAddMemberModal() : closeAddMemberModal())}>
        <DialogContent className="w-[min(92vw,40rem)] max-h-[90vh] overflow-hidden border-0 p-0 shadow-2xl">
          <div className="max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="border-b border-gray-100 px-6 pb-3 pt-5">
              <DialogTitle
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                className="text-2xl text-gray-950"
              >
                Add Team Member
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Add an existing user to this project, or use email to match an existing profile.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-900">Existing User</label>
                <Popover open={isCandidatePopoverOpen} onOpenChange={setIsCandidatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        value={memberSearch}
                        onChange={(event) => {
                          setMemberSearch(event.target.value);
                          setIsCandidatePopoverOpen(true);
                          setAddMemberErrors((current) => ({ ...current, member: undefined }));

                          if (
                            selectedCandidate &&
                            getCandidatePrimaryLabel(selectedCandidate).toLowerCase() !==
                              event.target.value.trim().toLowerCase()
                          ) {
                            setSelectedCandidate(null);
                            setAddMemberForm((current) => ({ ...current, user_id: '' }));
                          }
                        }}
                        onFocus={() => setIsCandidatePopoverOpen(true)}
                        placeholder="Search by name, email, or user ID"
                        aria-expanded={isCandidatePopoverOpen}
                        className={`${formControlClassName} pr-10`}
                      />
                      <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandEmpty>
                          {isCandidateLoading
                            ? 'Loading users...'
                            : memberSearch.trim()
                              ? 'No users match your search.'
                              : 'No available users found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredMemberCandidates.map((candidate) => (
                            <CommandItem
                              key={candidate.id}
                              value={`${candidate.full_name || ''} ${candidate.email || ''} ${candidate.id}`}
                              onSelect={() => {
                                setSelectedCandidate(candidate);
                                setMemberSearch(getCandidatePrimaryLabel(candidate));
                                setAddMemberForm((current) => ({ ...current, user_id: candidate.id }));
                                setAddMemberErrors((current) => ({ ...current, member: undefined }));
                                setIsCandidatePopoverOpen(false);
                              }}
                            >
                              <Check
                                className={`h-4 w-4 ${
                                  addMemberForm.user_id === candidate.id ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">
                                  {getCandidatePrimaryLabel(candidate)}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {getCandidateSecondaryLabel(candidate)}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-900">Email</label>
                <Input
                  type="email"
                  value={addMemberForm.email}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setAddMemberForm((current) => ({ ...current, email: nextValue }));
                    setAddMemberErrors((current) => ({ ...current, member: undefined }));

                    if (selectedCandidate?.email?.toLowerCase() !== nextValue.trim().toLowerCase()) {
                      setSelectedCandidate(null);
                      setAddMemberField('user_id', '');
                    }
                  }}
                  placeholder="Enter an existing user's email"
                  className={formControlClassName}
                />
                <p className="mt-1 text-xs text-gray-500">
                  If the email matches an existing user, they&apos;ll be added immediately. Pending invitations
                  are not available yet.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-900">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={addMemberForm.role}
                  onChange={(event) => setAddMemberField('role', event.target.value as ProjectMemberRole)}
                  aria-invalid={Boolean(addMemberErrors.role)}
                  className={formControlClassName}
                >
                  {PROJECT_MEMBER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {addMemberErrors.role ? <p className="mt-1 text-sm text-red-600">{addMemberErrors.role}</p> : null}
              </div>

              {addMemberErrors.member ? <p className="text-sm text-red-600">{addMemberErrors.member}</p> : null}

              <DialogFooter className="border-t border-gray-100 pt-3">
                <Button type="button" variant="outline" onClick={closeAddMemberModal} disabled={isAddingMember}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingMember} className="bg-[#204EA7] text-white hover:bg-[#1a3d8a]">
                  {isAddingMember ? 'Adding...' : 'Add Member'}
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
              className="border border-red-700 bg-white text-red-700 transition-all duration-200 hover:bg-red-700 hover:text-white hover:shadow-sm"
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
