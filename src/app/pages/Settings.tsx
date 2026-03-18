import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { User, Building2, Bell, Palette, Shield, Key, Globe, Mail, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="ml-56 pt-16 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
            Settings
          </h1>
          <p className="text-gray-600">Manage your account and workspace preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left bg-[#204EA7]/10 text-[#204EA7] rounded-lg font-medium mb-1">
                <User className="w-5 h-5" />
                Profile Settings
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg font-medium mb-1">
                <Building2 className="w-5 h-5" />
                Workspace Settings
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg font-medium mb-1">
                <Bell className="w-5 h-5" />
                Notifications
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg font-medium mb-1">
                <Palette className="w-5 h-5" />
                Appearance
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
                <Shield className="w-5 h-5" />
                Security & Privacy
              </button>
            </div>
          </div>

          {/* Main Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <User className="w-6 h-6 text-[#204EA7]" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Profile Settings
                </h2>
              </div>

              {/* Profile Photo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-2xl font-semibold">
                    SJ
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium mb-2">
                      Upload Photo
                    </button>
                    <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    defaultValue="Sarah"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    defaultValue="Johnson"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  defaultValue="sarah@company.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                />
              </div>

              {/* Job Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  defaultValue="Product Manager"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                />
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  rows={3}
                  defaultValue="Experienced product manager with a passion for building user-centric solutions."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent resize-none"
                />
              </div>

              <button className="px-6 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
                Save Changes
              </button>
            </div>

            {/* Workspace Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Building2 className="w-6 h-6 text-[#204EA7]" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Workspace Settings
                </h2>
              </div>

              {/* Workspace Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
                <input
                  type="text"
                  defaultValue="Acme Corporation"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                />
              </div>

              {/* Workspace URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Workspace URL</label>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    defaultValue="acme-corp"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">.origin.app</span>
                </div>
              </div>

              {/* Language & Region */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent">
                    <option>PST (GMT-8)</option>
                    <option>EST (GMT-5)</option>
                    <option>GMT (GMT+0)</option>
                    <option>CET (GMT+1)</option>
                  </select>
                </div>
              </div>

              <button className="px-6 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium">
                Update Workspace
              </button>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Bell className="w-6 h-6 text-[#204EA7]" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Notifications
                </h2>
              </div>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-start justify-between py-3 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive email updates about your tasks and projects</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#204EA7]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#204EA7]"></div>
                  </label>
                </div>

                {/* Push Notifications */}
                <div className="flex items-start justify-between py-3 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Push Notifications</h3>
                      <p className="text-sm text-gray-600">Get push notifications on your devices</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => setPushNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#204EA7]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#204EA7]"></div>
                  </label>
                </div>

                {/* Task Reminders */}
                <div className="flex items-start justify-between py-3">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Task Reminders</h3>
                      <p className="text-sm text-gray-600">Get reminders for upcoming task deadlines</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskReminders}
                      onChange={(e) => setTaskReminders(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#204EA7]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#204EA7]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Palette className="w-6 h-6 text-[#204EA7]" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Appearance
                </h2>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      theme === 'light'
                        ? 'border-[#204EA7] bg-[#204EA7]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-gray-700" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Light</div>
                      <div className="text-xs text-gray-600">Default theme</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-[#204EA7] bg-[#204EA7]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-gray-700" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Dark</div>
                      <div className="text-xs text-gray-600">Coming soon</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Security & Privacy */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Shield className="w-6 h-6 text-[#204EA7]" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Security & Privacy
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Password</h3>
                      <p className="text-sm text-gray-600">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    Change Password
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors text-sm font-medium">
                    Enable 2FA
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Active Sessions</h3>
                      <p className="text-sm text-gray-600">Manage your active sessions across devices</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    View Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
