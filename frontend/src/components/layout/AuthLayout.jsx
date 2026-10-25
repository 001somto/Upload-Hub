// components/layout/AuthLayout.jsx
// WHAT THIS FILE IS: the frame around the sign-in, sign-up and password pages.
// WHAT IT DOES: on large screens, shows a green panel that explains UploadHub beside the
// form; on phones it shows only the form with the logo above it.

import { Link, Outlet } from "react-router-dom";
import { settings } from "../../config/settings";
import { ArrowLeft, Building2, FolderOpen, ShieldCheck } from "../../lib/icons";
import Logo, { LogoMark } from "../ui/Logo";

const POINTS = [
  { icon: FolderOpen, text: "Keep your own files in a personal workspace from day one." },
  { icon: Building2, text: "Join your department to reach its shared records." },
  { icon: ShieldCheck, text: "Every action is checked on the server and written to the audit trail." },
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Left panel: only on large screens. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-leaf-800 via-leaf-900 to-leaf-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 animate-float-slow rounded-full bg-leaf-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 animate-float rounded-full bg-leaf-400/10 blur-3xl" />
        <Link to="/" className="relative w-fit" aria-label={`${settings.appName} home`}>
          <Logo tone="light" />
        </Link>
        <div className="relative">
          <LogoMark className="mb-6 h-14 w-14" />
          <h2 className="max-w-md text-4xl font-extrabold leading-tight">Your department's files, in order.</h2>
          <ul className="mt-8 max-w-md space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-leaf-100">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-leaf-200">{settings.institution}</p>
      </aside>

      {/* Right side: the form. */}
      <div className="flex min-h-screen flex-col bg-paper">
        <div className="flex items-center justify-between px-4 py-5 sm:px-8">
          <Link to="/" className="lg:hidden" aria-label={`${settings.appName} home`}>
            <Logo />
          </Link>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
