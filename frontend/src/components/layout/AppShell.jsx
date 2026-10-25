// components/layout/AppShell.jsx
// WHAT THIS FILE IS: the frame around every signed-in screen (User area and Admin area).
// WHAT IT DOES: draws the sidebar menu, the top bar (notifications bell and profile menu)
// and puts the current screen in the middle. The menu items depend on the role: Admins
// and Users see different menus. On phones the sidebar slides in from the left.

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useApiData from "../../hooks/useApiData";
import useClickOutside from "../../hooks/useClickOutside";
import { api } from "../../lib/api";
import {
  Activity, Bell, Building2, ChevronDown, ClipboardList, FolderOpen, Gauge, LayoutDashboard,
  LogOut, Menu, Settings, Share2, UserPlus, Users, X,
} from "../../lib/icons";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Logo from "../ui/Logo";

// The menu for each role. `end: true` means "only highlight on this exact page".
const NAV = {
  user: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/files", label: "My files", icon: FolderOpen },
    { to: "/app/department", label: "Department", icon: Building2 },
    { to: "/app/shares", label: "Share links", icon: Share2 },
    { to: "/app/activity", label: "My activity", icon: Activity },
    { to: "/app/notifications", label: "Notifications", icon: Bell },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/members", label: "Members", icon: Users },
    { to: "/admin/requests", label: "Join requests", icon: UserPlus },
    { to: "/admin/files", label: "Department files", icon: Building2 },
    { to: "/admin/workspace", label: "My workspace", icon: FolderOpen },
    { to: "/admin/analytics", label: "Storage analytics", icon: Gauge },
    { to: "/admin/audit", label: "Audit trail", icon: ClipboardList },
    { to: "/admin/shares", label: "Share links", icon: Share2 },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

// The bell in the top bar. It shows a count only when the backend reports unread items.
function NotificationBell({ role }) {
  const result = useApiData(() => api.notifications.list(), []);
  const location = useLocation();
  const { reload } = result;
  // Look again after each page change so the count stays fresh.
  useEffect(() => {
    reload();
  }, [location.pathname, reload]);

  const unread = result.status === "ready" && result.data ? result.data.unreadCount || 0 : 0;
  return (
    <Link
      to={`${role === "admin" ? "/admin" : "/app"}/notifications`}
      className="relative rounded-xl p-2.5 text-muted transition hover:bg-leaf-100 hover:text-ink"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-leaf-600 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

// The profile button and its small drop-down menu.
function ProfileMenu({ role }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition hover:bg-leaf-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} src={user.profilePhotoUrl} />
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink sm:block">{user.name}</span>
        <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-60 animate-pop rounded-2xl border border-line bg-white p-2 shadow-lift">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link
            role="menuitem"
            to={`${role === "admin" ? "/admin" : "/app"}/settings`}
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-leaf-100"
          >
            <Settings className="h-4 w-4" aria-hidden="true" /> Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({ role, onNavigate }) {
  const items = NAV[role];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to={role === "admin" ? "/admin" : "/app"} onClick={onNavigate} aria-label="UploadHub dashboard">
          <Logo />
        </Link>
      </div>
      <nav aria-label={role === "admin" ? "Admin menu" : "User menu"} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive ? "bg-leaf-100 text-leaf-900" : "text-muted hover:bg-leaf-50 hover:text-ink"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function AppShell({ role }) {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the phone sidebar when the page changes, and when Escape is pressed.
  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-paper lg:pl-64">
      <a href="#content" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-leaf-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Sidebar for large screens. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <SidebarContent role={role} />
      </aside>

      {/* Sidebar drawer for phones and tablets. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade bg-leaf-950/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade bg-white shadow-window">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3.5 rounded-lg p-2 text-muted hover:bg-leaf-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent role={role} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl p-2 text-ink hover:bg-leaf-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <Badge tone={role === "admin" ? "green" : "neutral"}>{role === "admin" ? "Admin" : "User"}</Badge>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell role={role} />
            {user ? <ProfileMenu role={role} /> : null}
          </div>
        </header>
        <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
