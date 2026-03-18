import { MobileTopBar } from '../components/MobileTopBar';
import { Plus, Search, MoreVertical, Users, Calendar } from 'lucide-react';

export function ProjectsMobile() {
  const projects = [
    {
      name: 'Website Redesign',
      status: 'In Progress',
      statusColor: 'bg-blue-100 text-blue-700',
      team: 5,
      dueDate: 'Mar 15, 2026',
      progress: 65,
    },
    {
      name: 'Mobile App Development',
      status: 'In Progress',
      statusColor: 'bg-blue-100 text-blue-700',
      team: 8,
      dueDate: 'Apr 20, 2026',
      progress: 45,
    },
    {
      name: 'Marketing Campaign',
      status: 'Planning',
      statusColor: 'bg-purple-100 text-purple-700',
      team: 4,
      dueDate: 'Mar 30, 2026',
      progress: 20,
    },
    {
      name: 'Product Launch',
      status: 'On Hold',
      statusColor: 'bg-yellow-100 text-yellow-700',
      team: 6,
      dueDate: 'May 10, 2026',
      progress: 30,
    },
    {
      name: 'Customer Portal',
      status: 'In Progress',
      statusColor: 'bg-blue-100 text-blue-700',
      team: 7,
      dueDate: 'Apr 5, 2026',
      progress: 80,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <MobileTopBar />

      {/* Main Content */}
      <main className="pt-14">
        <div className="p-4">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl mb-1 font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              Projects
            </h1>
            <p className="text-xs text-gray-500 font-normal">Manage your active projects</p>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#204EA7] focus:ring-2 focus:ring-[#204EA7]/10 outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          </div>

          {/* Create Project Button */}
          <button className="w-full bg-[#204EA7] text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#1a3d8a] transition-colors font-medium mb-6 min-h-[44px]">
            <Plus className="w-4 h-4" />
            New Project
          </button>

          {/* Projects List */}
          <div className="space-y-4">
            {projects.map((project, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {/* Project Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {project.name}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${project.statusColor}`}>
                      {project.status}
                    </span>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#676769]">Progress</span>
                    <span className="text-xs font-medium text-[#1a1a1a]">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#204EA7] rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Project Meta */}
                <div className="flex items-center gap-4 text-xs text-[#676769]">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{project.team} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{project.dueDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
