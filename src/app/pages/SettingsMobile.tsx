import { MobileTopBar } from '../components/MobileTopBar';
import { User, Building2, Bell, Palette, Shield, Key, Globe, Mail, Moon, Sun, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function SettingsMobile() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <MobileTopBar />

      <main className="pt-14 pb-20">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200 mb-4">
          <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
            Settings
          </h1>
          <p className="text-sm text-gray-600">Manage your account and preferences</p>
        </div>

        <div className="space-y-4 px-4">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-[#204EA7]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Profile Settings
                </h2>
              </div>

              {/* Profile Photo */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#204EA7] flex items-center justify-center text-white text-xl font-semibold">
                  SJ
                </div>
                <div className="flex-1">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium w-full min-h-[44px]">
                    Upload Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                defaultValue="Sarah Johnson"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
              />
            </div>

            {/* Email */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                defaultValue="sarah@company.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
              />
            </div>

            {/* Job Title */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
              <input
                type="text"
                defaultValue="Product Manager"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
              />
            </div>

            {/* Bio */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                rows={3}
                defaultValue="Experienced product manager with a passion for building user-centric solutions."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent resize-none"
              />
            </div>

            <div className="p-4">
              <button className="w-full px-4 py-3 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium min-h-[44px]">
                Save Changes
              </button>
            </div>
          </div>

          {/* Workspace Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#204EA7]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Workspace Settings
                </h2>
              </div>
            </div>

            {/* Workspace Name */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
              <input
                type="text"
                defaultValue="Acme Corporation"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
              />
            </div>

            {/* Workspace URL */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Workspace URL</label>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  defaultValue="acme-corp"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]"
                />
              </div>
              <p className="text-xs text-gray-500">.origin.app</p>
            </div>

            {/* Language */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>

            {/* Time Zone */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
              <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent min-h-[44px]">
                <option>PST (GMT-8)</option>
                <option>EST (GMT-5)</option>
                <option>GMT (GMT+0)</option>
                <option>CET (GMT+1)</option>
              </select>
            </div>

            <div className="p-4">
              <button className="w-full px-4 py-3 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium min-h-[44px]">
                Update Workspace
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#204EA7]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Notifications
                </h2>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 min-h-[68px]">
              <div className="flex items-start gap-3 flex-1">
                <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Email Notifications</h3>
                  <p className="text-xs text-gray-600">Get email updates about tasks</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-2">
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
            <div className="flex items-center justify-between p-4 border-b border-gray-100 min-h-[68px]">
              <div className="flex items-start gap-3 flex-1">
                <Bell className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Push Notifications</h3>
                  <p className="text-xs text-gray-600">Get push notifications on devices</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-2">
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
            <div className="flex items-center justify-between p-4 min-h-[68px]">
              <div className="flex items-start gap-3 flex-1">
                <Bell className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Task Reminders</h3>
                  <p className="text-xs text-gray-600">Reminders for upcoming deadlines</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-2">
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

          {/* Appearance */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-[#204EA7]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Appearance
                </h2>
              </div>
            </div>

            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
              <div className="space-y-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all min-h-[60px] ${
                    theme === 'light'
                      ? 'border-[#204EA7] bg-[#204EA7]/5'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun className="w-5 h-5 text-gray-700" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Light</div>
                      <div className="text-xs text-gray-600">Default theme</div>
                    </div>
                  </div>
                  {theme === 'light' && (
                    <div className="w-5 h-5 rounded-full bg-[#204EA7] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all min-h-[60px] ${
                    theme === 'dark'
                      ? 'border-[#204EA7] bg-[#204EA7]/5'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-gray-700" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Dark</div>
                      <div className="text-xs text-gray-600">Coming soon</div>
                    </div>
                  </div>
                  {theme === 'dark' && (
                    <div className="w-5 h-5 rounded-full bg-[#204EA7] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Security & Privacy */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#204EA7]" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
                  Security & Privacy
                </h2>
              </div>
            </div>

            {/* Password */}
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors min-h-[68px]">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 mb-1">Password</h3>
                  <p className="text-xs text-gray-600">Last changed 3 months ago</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            {/* Two-Factor Authentication */}
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors min-h-[68px]">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 mb-1">Two-Factor Authentication</h3>
                  <p className="text-xs text-gray-600">Add extra security</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            {/* Active Sessions */}
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors min-h-[68px]">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 mb-1">Active Sessions</h3>
                  <p className="text-xs text-gray-600">Manage active sessions</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
