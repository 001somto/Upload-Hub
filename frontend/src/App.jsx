// App.jsx
// WHAT THIS FILE IS: the map of the website - which address shows which page.
// WHAT IT DOES: lists every route. The routes are grouped by who can open them:
//   Public pages     -> everyone (landing page, About, Help, Privacy, Contact)
//   Share pages      -> anyone with a share link
//   Sign-in pages    -> only people who are signed out
//   /app/...         -> signed-in Users only
//   /admin/...       -> signed-in Admins only
// The route guards (RouteGuards.jsx) improve the experience, but the backend is what really
// protects data.

import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import AuthLayout from "./components/layout/AuthLayout";
import PublicLayout from "./components/layout/PublicLayout";
import { GuestOnly, RequireRole } from "./components/layout/RouteGuards";

import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import RoleChooser from "./pages/auth/RoleChooser";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import LandingPage from "./pages/public/LandingPage";
import { AboutPage, ContactPage, HelpPage, NotFoundPage, PrivacyPage } from "./pages/public/StaticPages";
import FilesPage from "./pages/shared/FilesPage";
import NotificationsPage from "./pages/shared/NotificationsPage";
import SettingsPage from "./pages/shared/SettingsPage";
import SharePage from "./pages/shared/SharePage";
import SharesPage from "./pages/shared/SharesPage";
import ActivityPage from "./pages/user/ActivityPage";
import DepartmentPage from "./pages/user/DepartmentPage";
import UserDashboard from "./pages/user/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import AuditPage from "./pages/admin/AuditPage";
import MembersPage from "./pages/admin/MembersPage";
import RequestsPage from "./pages/admin/RequestsPage";

export default function App() {
  return (
    <Routes>
      {/* ----- Public pages ----- */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* ----- Share link page (open to anyone with the link) ----- */}
      <Route path="share/:linkId" element={<SharePage />} />

      {/* ----- Sign in, sign up and password pages (signed-out visitors only) ----- */}
      <Route element={<GuestOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="signin" element={<RoleChooser mode="signin" />} />
          <Route path="signup" element={<RoleChooser mode="signup" />} />
          <Route path="signin/user" element={<SignInPage role="user" />} />
          <Route path="signin/admin" element={<SignInPage role="admin" />} />
          <Route path="signup/user" element={<SignUpPage role="user" />} />
          <Route path="signup/admin" element={<SignUpPage role="admin" />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* ----- User area ----- */}
      <Route
        path="app"
        element={
          <RequireRole role="user">
            <AppShell role="user" />
          </RequireRole>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="files" element={<FilesPage scope="independent" title="My files" description="Your own workspace. Only you can see these files unless you share them." />} />
        <Route path="department" element={<DepartmentPage />} />
        <Route path="shares" element={<SharesPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      {/* ----- Admin area ----- */}
      <Route
        path="admin"
        element={
          <RequireRole role="admin">
            <AppShell role="admin" />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="files" element={<FilesPage scope="department" title="Department files" description="Files and folders shared with your department. Private to approved members." />} />
        <Route path="workspace" element={<FilesPage scope="independent" title="My workspace" description="Your own files. This is separate from the department's storage." />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="shares" element={<SharesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
