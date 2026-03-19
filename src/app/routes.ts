import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from './auth';
import { LoginScreen } from './pages/LoginScreen';
import { LoginScreenMobile } from './pages/LoginScreenMobile';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MFAVerificationPage } from './pages/MFAVerificationPage';
import { Dashboard } from './pages/Dashboard';
import { DashboardMobile } from './pages/DashboardMobile';
import { Projects } from './pages/Projects';
import { ProjectsMobile } from './pages/ProjectsMobile';
import { ProjectBoard } from './pages/ProjectBoard';
import { ProjectBoardMobile } from './pages/ProjectBoardMobile';
import { MyTasks } from './pages/MyTasks';
import { MyTasksMobile } from './pages/MyTasksMobile';
import { Calendar } from './pages/CalendarPage';
import { CalendarMobile } from './pages/CalendarMobile';
import { Team } from './pages/Team';
import { TeamMobile } from './pages/TeamMobile';
import { Chat } from './pages/Chat';
import { ChatMobile } from './pages/ChatMobile';
import { Settings } from './pages/Settings';
import { SettingsMobile } from './pages/SettingsMobile';

export const router = createBrowserRouter([
  // ─── Public routes (no auth required) ────────────────────────────
  {
    path: '/login',
    Component: LoginScreen,
  },
  {
    path: '/login-mobile',
    Component: LoginScreenMobile,
  },
  {
    path: '/register',
    Component: RegisterPage,
  },
  {
    path: '/forgot-password',
    Component: ForgotPasswordPage,
  },
  {
    path: '/reset-password',
    Component: ResetPasswordPage,
  },
  {
    path: '/mfa-verify',
    Component: MFAVerificationPage,
  },

  // ─── Protected routes (require authentication) ───────────────────
  // All children of this layout route are guarded by ProtectedRoute.
  // If the user is not logged in, they see the Unauthorized page.
  {
    Component: ProtectedRoute,
    children: [
      {
        path: '/',
        Component: Dashboard,
      },
      {
        path: '/dashboard',
        Component: Dashboard,
      },
      {
        path: '/dashboard-mobile',
        Component: DashboardMobile,
      },
      {
        path: '/projects',
        Component: Projects,
      },
      {
        path: '/projects-mobile',
        Component: ProjectsMobile,
      },
      {
        path: '/project-board',
        Component: ProjectBoard,
      },
      {
        path: '/project-board-mobile',
        Component: ProjectBoardMobile,
      },
      {
        path: '/tasks',
        Component: MyTasks,
      },
      {
        path: '/tasks-mobile',
        Component: MyTasksMobile,
      },
      {
        path: '/calendar',
        Component: Calendar,
      },
      {
        path: '/calendar-mobile',
        Component: CalendarMobile,
      },
      {
        path: '/team',
        Component: Team,
      },
      {
        path: '/team-mobile',
        Component: TeamMobile,
      },
      {
        path: '/messages',
        Component: Chat,
      },
      {
        path: '/messages-mobile',
        Component: ChatMobile,
      },
      {
        path: '/settings',
        Component: Settings,
      },
      {
        path: '/settings-mobile',
        Component: SettingsMobile,
      },
    ],
  },
]);
