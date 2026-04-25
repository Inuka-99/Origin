import { Search, Bell, ChevronDown, FolderKanban, CheckSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthUser, LogoutButton } from '../auth';
import { useApiClient } from '../lib/api-client';
import { useClickOutside } from '../lib/useClickOutside';

interface SearchProjectResult {
  id: string;
  name: string;
  description: string | null;
}

interface SearchTaskResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

export function TopBar() {
  const api = useApiClient();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<SearchProjectResult[]>([]);
  const [tasks, setTasks] = useState<SearchTaskResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const latestSearchRequestRef = useRef(0);

  useClickOutside(searchContainerRef, () => setIsSearchOpen(false));

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((namePart) => namePart[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const trimmedSearch = searchQuery.trim();

    if (!trimmedSearch) {
      latestSearchRequestRef.current += 1;
      setProjects([]);
      setTasks([]);
      setIsSearchLoading(false);
      setSearchError(null);
      return;
    }

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsSearchLoading(true);
        setSearchError(null);

        try {
          const [projectResults, taskResults] = await Promise.allSettled([
            api.get<SearchProjectResult[]>(`/projects?search=${encodeURIComponent(trimmedSearch)}`),
            api.get<SearchTaskResult[]>(`/tasks?search=${encodeURIComponent(trimmedSearch)}`),
          ]);

          if (latestSearchRequestRef.current !== requestId) {
            return;
          }

          const resolvedProjects =
            projectResults.status === 'fulfilled'
              ? projectResults.value.slice(0, 5)
              : [];
          const resolvedTasks =
            taskResults.status === 'fulfilled'
              ? taskResults.value.slice(0, 5)
              : [];

          setProjects(resolvedProjects);
          setTasks(resolvedTasks);

          if (projectResults.status === 'rejected') {
            console.error('Failed to load project search results', projectResults.reason);
          }

          if (taskResults.status === 'rejected') {
            console.error('Failed to load task search results', taskResults.reason);
          }

          if (projectResults.status === 'rejected' && taskResults.status === 'rejected') {
            setSearchError('Unable to search right now.');
          }
        } catch (error) {
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }

          console.error('Failed to load global search results', error);
          setProjects([]);
          setTasks([]);
          setSearchError('Unable to search right now.');
        } finally {
          if (latestSearchRequestRef.current === requestId) {
            setIsSearchLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [api, isSearchOpen, searchQuery]);

  const navigateToSearch = (path: '/projects' | '/tasks') => {
    const trimmedSearch = searchQuery.trim();
    const target = trimmedSearch
      ? `${path}?search=${encodeURIComponent(trimmedSearch)}`
      : path;

    setIsSearchOpen(false);
    navigate(target);
  };

  const quickLinks = [
    {
      label: 'Projects',
      description: 'Browse and filter your projects',
      path: '/projects' as const,
      icon: FolderKanban,
    },
    {
      label: 'My Tasks',
      description: 'Search tasks and adjust filters',
      path: '/tasks' as const,
      icon: CheckSquare,
    },
  ];

  const hasSearchResults = projects.length > 0 || tasks.length > 0;

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-56 z-10 flex items-center justify-between px-8">
      <div className="flex-1 max-w-xl">
        <div ref={searchContainerRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onClick={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                navigateToSearch('/tasks');
              }
            }}
            className="w-full bg-[#F7F8FA] border-0 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]/20"
          />

          {isSearchOpen && (
            <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg z-30">
              {!searchQuery.trim() ? (
                <div className="p-3">
                  <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Quick Access
                  </div>
                  <div className="space-y-1">
                    {quickLinks.map((link) => (
                      <button
                        key={link.label}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(link.path);
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-[#204EA7]/10 p-2 text-[#204EA7]">
                            <link.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{link.label}</div>
                            <div className="text-xs text-gray-500">{link.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : isSearchLoading ? (
                <div className="p-4 text-sm text-gray-500">Searching projects and tasks...</div>
              ) : searchError ? (
                <div className="p-4 text-sm text-red-500">{searchError}</div>
              ) : hasSearchResults ? (
                <div className="max-h-[28rem] overflow-y-auto p-3">
                  {projects.length > 0 && (
                    <div className="mb-3">
                      <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Projects
                      </div>
                      <div className="space-y-1">
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => navigateToSearch('/projects')}
                            className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            <div className="line-clamp-1 text-xs text-gray-500">
                              {project.description || 'No description'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tasks.length > 0 && (
                    <div>
                      <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Tasks
                      </div>
                      <div className="space-y-1">
                        {tasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => navigateToSearch('/tasks')}
                            className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {task.status}
                              </span>
                            </div>
                            <div className="line-clamp-1 text-xs text-gray-500">
                              {task.description || 'No description'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-sm text-gray-500">
                  No projects or tasks matched "{searchQuery.trim()}".
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#204EA7] rounded-full"></span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name ?? 'User'}
              </div>
              <div className="text-xs text-gray-500">
                {user?.email ?? ''}
              </div>
            </div>
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 bg-[#204EA7] rounded-full flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name ?? 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email ?? ''}
                  </div>
                </div>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/settings');
                  }}
                >
                  Profile Settings
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Preferences
                </button>
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <LogoutButton />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
