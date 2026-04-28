import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { GoogleCalendarCard } from '../components/GoogleCalendarCard';
import { User, Building2, Bell, Palette, Shield, Key, Globe, Mail, Moon, Sun, Monitor, Plug } from 'lucide-react';
import { useTheme, type ThemePreference } from '../theme';
import { useState, useEffect } from 'react';
import { useProfile } from '../lib/useProfile';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type TabKey = 'profile' | 'workspace' | 'notifications' | 'appearance' | 'security' | 'integrations';

const TABS: { key: TabKey; label: string; Icon: typeof User }[] = [
  { key: 'profile',       label: 'Profile Settings',    Icon: User },
  { key: 'workspace',     label: 'Workspace Settings',  Icon: Building2 },
  { key: 'notifications', label: 'Notifications',       Icon: Bell },
  { key: 'appearance',    label: 'Appearance',          Icon: Palette },
  { key: 'security',      label: 'Security & Privacy',  Icon: Shield },
  { key: 'integrations',  label: 'Integrations',        Icon: Plug },
];

export function Settings() {
  const { preference: theme, setPreference: setTheme, resolved } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);

  // ---- Profile state ------------------------------------------
  const { profile, loading: profileLoading, error: profileError, save: saveProfile } = useProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  // Hydrate the form whenever the profile finishes loading or refreshes.
  useEffect(() => {
    if (!profile) return;
    const parts = (profile.full_name ?? '').trim().split(/\s+/).filter(Boolean);
    const first = parts.shift() ?? '';
    const last = parts.join(' ');
    setFirstName(first);
    setLastName(last);
    setProfileEmail(profile.email ?? '');
    setJobTitle(profile.job_title ?? '');
    setBio(profile.bio ?? '');
    setProfileDirty(false);
  }, [profile]);

  const initials = (
    (firstName?.[0] ?? '') + (lastName?.[0] ?? profileEmail?.[0] ?? '')
  ).toUpperCase() || '??';

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await saveProfile({
        full_name: fullName,
        email: profileEmail.trim() || undefined,
        job_title: jobTitle.trim() || null,
        bio: bio.trim() || null,
      });
      toast.success('Profile updated');
      setProfileDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };


  // Read ?tab= from URL on mount so the backend can deep-link (e.g. after
  // OAuth redirect) straight to the Integrations tab.
  const initialTab: TabKey = (() => {
    const t = new URLSearchParams(window.location.search).get('tab') as TabKey | null;
    if (t && TABS.some((x) => x.key === t)) return t;
    if (new URLSearchParams(window.location.search).get('google')) return 'integrations';
    return 'profile';
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="pt-16 p-8 transition-[margin] duration-200 ease-out" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-text-secondary">Manage your account and workspace preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-lg shadow-sm p-2">
              {TABS.map(({ key, label, Icon }, i) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg font-medium',
                      i < TABS.length - 1 ? 'mb-1' : '',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:bg-surface-sunken',
                    ].join(' ')}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
            <div className="bg-surface rounded-2xl shadow-card p-6 hairline border">
              <div className="flex items-center gap-4 mb-6">
                <User className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                  Profile Settings
                </h2>
              </div>

              {profileLoading && !profile ? (
                <div className="flex items-center gap-2 text-sm text-text-secondary py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading profile…
                </div>
              ) : (
                <>
                  {profileError && (
                    <p className="mb-4 text-sm text-status-danger bg-status-danger-soft border border-status-danger rounded-lg px-3 py-2">
                      {profileError}
                    </p>
                  )}

                  {/* Profile Photo */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-secondary mb-3">Profile Photo</label>
                    <div className="flex items-center gap-4">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || profile.email}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-on-accent text-2xl font-semibold">
                          {initials}
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          disabled
                          title="Photo upload coming soon — use your Auth0 profile picture for now"
                          className="px-4 py-2 bg-surface-hover text-text-secondary rounded-lg transition-colors text-sm font-medium mb-2 opacity-60 cursor-not-allowed"
                        >
                          Upload Photo
                        </button>
                        <p className="text-xs text-text-tertiary">JPG, PNG or GIF. Max size 5MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setProfileDirty(true); }}
                        className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); setProfileDirty(true); }}
                        className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => { setProfileEmail(e.target.value); setProfileDirty(true); }}
                      className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                    <p className="text-xs text-text-tertiary mt-1">
                      Auth0 owns sign-in. Changing this here updates your workspace profile only.
                    </p>
                  </div>

                  {/* Job Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-2">Job Title</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => { setJobTitle(e.target.value); setProfileDirty(true); }}
                      placeholder="e.g. Product Manager"
                      className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>

                  {/* Bio */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-secondary mb-2">Bio</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => { setBio(e.target.value); setProfileDirty(true); }}
                      placeholder="A short description teammates see on your profile"
                      className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={profileSaving || !profileDirty}
                    className="px-6 py-2.5 bg-accent text-on-accent rounded-lg hover:bg-accent-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {profileSaving ? 'Saving…' : profileDirty ? 'Save Changes' : 'Saved'}
                  </button>
                </>
              )}
            </div>
            )}

            {/* Workspace Settings */}
            {activeTab === 'workspace' && (
            <div className="bg-surface rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Building2 className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                  Workspace Settings
                </h2>
              </div>

              {/* Workspace Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">Workspace Name</label>
                <input
                  type="text"
                  defaultValue="Acme Corporation"
                  className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              {/* Workspace URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">Workspace URL</label>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-text-tertiary" />
                  <input
                    type="text"
                    defaultValue="acme-corp"
                    className="flex-1 px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <span className="text-sm text-text-tertiary">.origin.app</span>
                </div>
              </div>

              {/* Language & Region */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
                  <select className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Time Zone</label>
                  <select className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent">
                    <option>PST (GMT-8)</option>
                    <option>EST (GMT-5)</option>
                    <option>GMT (GMT+0)</option>
                    <option>CET (GMT+1)</option>
                  </select>
                </div>
              </div>

              <button className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium">
                Update Workspace
              </button>
            </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
            <div className="bg-surface rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Bell className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                  Notifications
                </h2>
              </div>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-start justify-between py-3 border-b border-divider">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-text-secondary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">Email Notifications</h3>
                      <p className="text-sm text-text-secondary">Receive email updates about your tasks and projects</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                {/* Push Notifications */}
                <div className="flex items-start justify-between py-3 border-b border-divider">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-text-secondary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">Push Notifications</h3>
                      <p className="text-sm text-text-secondary">Get push notifications on your devices</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => setPushNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                {/* Task Reminders */}
                <div className="flex items-start justify-between py-3">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-text-secondary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">Task Reminders</h3>
                      <p className="text-sm text-text-secondary">Get reminders for upcoming task deadlines</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskReminders}
                      onChange={(e) => setTaskReminders(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>
              </div>
            </div>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
            <div className="bg-surface rounded-2xl shadow-card p-6 hairline border">
              <div className="flex items-center gap-4 mb-6">
                <Palette className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold text-text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Appearance
                </h2>
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-text-secondary mb-3">Theme</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { value: 'system' as ThemePreference, label: 'System',  hint: 'Follow your device', Icon: Monitor },
                    { value: 'light'  as ThemePreference, label: 'Light',   hint: 'Bright, classic',    Icon: Sun },
                    { value: 'dark'   as ThemePreference, label: 'Dark',    hint: 'Easy on the eyes',   Icon: Moon },
                  ]).map(({ value, label, hint, Icon }) => {
                    const active = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                          active
                            ? 'border-accent bg-accent-soft ring-1 ring-accent'
                            : 'border-border-subtle hover:border-border-strong hover:bg-surface-hover'
                        }`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          active ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-text-secondary'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <div>
                          <div className="text-sm font-medium text-text-primary">{label}</div>
                          <div className="text-xs text-text-tertiary">{hint}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-text-tertiary">
                  Currently active: <span className="font-medium text-text-secondary capitalize">{resolved}</span>
                </p>
              </div>
            </div>
            )}

            {/* Security & Privacy */}
            {activeTab === 'security' && (
            <div className="bg-surface rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Shield className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                  Security & Privacy
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-divider">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-text-secondary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">Password</h3>
                      <p className="text-sm text-text-secondary">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-surface-hover text-text-secondary rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium">
                    Change Password
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-divider">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-text-secondary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">Two-Factor Authentication</h3>
                      <p className="text-sm text-text-secondary">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium">
                    Enable 2FA
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-text-secondary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">Active Sessions</h3>
                      <p className="text-sm text-text-secondary">Manage your active sessions across devices</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-surface-hover text-text-secondary rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium">
                    View Sessions
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
            <div id="integrations" className="space-y-6">
              <div className="bg-surface rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Plug className="w-6 h-6 text-accent" />
                  <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                    Integrations
                  </h2>
                </div>
                <p className="text-sm text-text-secondary">
                  Connect Origin to your external tools. Only Google Calendar is available right now.
                </p>
              </div>
              <GoogleCalendarCard />
            </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
