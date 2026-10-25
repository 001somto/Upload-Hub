// components/layout/PublicLayout.jsx
// WHAT THIS FILE IS: the frame around every public page (landing page, About, Help...).
// WHAT IT DOES: draws the top bar (logo, section links, Sign in / Get started) and the
// footer, and puts the page itself in between. On phones the links fold into a menu.

import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { settings } from "../../config/settings";
import { Menu, X } from "../../lib/icons";
import Button from "../ui/Button";
import Logo from "../ui/Logo";

// Links that jump to sections of the landing page. Plain <a> tags make the browser scroll.
const SECTION_LINKS = [
  { href: "/#showcase", label: "See the app" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#security", label: "Security" },
];

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the phone menu whenever the page changes.
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label={`${settings.appName} home`}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {SECTION_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-leaf-100 hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button to="/signin" variant="ghost">
            Sign in
          </Button>
          <Button to="/signup">Get started</Button>
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-ink transition hover:bg-leaf-100 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="animate-fade border-t border-line bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {SECTION_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-leaf-100">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button to="/signin" variant="secondary">
              Sign in
            </Button>
            <Button to="/signup">Get started</Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted">
            A secure home for department files at the {settings.institution}.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink">Get started</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-ink" to="/signup/user">Create a User account</Link></li>
            <li><Link className="hover:text-ink" to="/signup/admin">Register as an Admin</Link></li>
            <li><Link className="hover:text-ink" to="/signin/user">User sign in</Link></li>
            <li><Link className="hover:text-ink" to="/signin/admin">Admin sign in</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><a className="hover:text-ink" href="/#features">Features</a></li>
            <li><a className="hover:text-ink" href="/#how-it-works">How it works</a></li>
            <li><a className="hover:text-ink" href="/#security">Security</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink">Company</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-ink" to="/about">About</Link></li>
            <li><Link className="hover:text-ink" to="/help">Help and FAQ</Link></li>
            <li><Link className="hover:text-ink" to="/privacy">Privacy</Link></li>
            <li><Link className="hover:text-ink" to="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
          {year} {settings.appName}. A student project at the {settings.institution}.
        </p>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-leaf-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
