// pages/public/LandingPage.jsx
// WHAT THIS FILE IS: the public home page of UploadHub (the first page visitors see).
// WHAT IT DOES: puts the landing page sections in order:
//   hero -> app showcase -> features -> choose your path -> how it works -> security -> final call to action.
// The hero and showcase live in components/landing. The other sections are below.

import { Link } from "react-router-dom";
import Hero from "../../components/landing/Hero";
import Showcase from "../../components/landing/Showcase";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  ArrowRight, Building2, Check, ClipboardList, Fingerprint, FolderOpen, Gauge, Link2, Lock, ShieldCheck, Share2, User,
} from "../../lib/icons";
import Button from "../../components/ui/Button";
import Reveal from "../../components/ui/Reveal";

// ---------- FEATURES ----------
const FEATURES = [
  {
    icon: FolderOpen,
    title: "Organised files and folders",
    text: "Nested folders, search, sorting and previews. Select several files to move, delete or download them together.",
  },
  {
    icon: Building2,
    title: "Department collaboration",
    text: "Join your department to reach its shared records. One Admin runs each department and approves who gets in.",
  },
  {
    icon: ShieldCheck,
    title: "Access you control",
    text: "Members can download by default. Admins add upload, folder, share and manage rights, one member or many at a time.",
  },
  {
    icon: Share2,
    title: "Secure sharing",
    text: "Share a file with a link that expires, and revoke it when you are done. Folder links ask people to sign in first.",
  },
  {
    icon: Gauge,
    title: "Storage you can see",
    text: "Know how much space you have used and what is left. Admins see usage by member and how it changes over time.",
  },
  {
    icon: ClipboardList,
    title: "A trail of every action",
    text: "Uploads, downloads, shares and membership decisions are recorded, so you can always check what happened.",
  },
];

function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-leaf-950 sm:text-4xl">Built for how departments really work</h2>
          <p className="mt-4 text-lg text-muted">More than a place to drop files: a way to keep them organised, shared with the right people, and accounted for.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={(index % 3) * 90}>
              <article className="group h-full rounded-2xl border border-line bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-leaf-300 hover:shadow-lift focus-within:-translate-y-1 focus-within:shadow-lift">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-800 transition duration-300 group-hover:bg-leaf-600 group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- CHOOSE YOUR PATH ----------
const PATHS = [
  {
    role: "user",
    icon: User,
    title: "I am a User",
    text: "You want a place for your own files, and maybe access to a department's records.",
    points: ["Your own workspace from day one", "Join a department when you are ready", "Share files with expiring links"],
  },
  {
    role: "admin",
    icon: Building2,
    title: "I am an Admin",
    text: "You are setting up a department and want to manage who can reach its files.",
    points: ["Create and run one department", "Approve members and set permissions", "See storage and the audit trail"],
  },
];

function ChoosePath() {
  return (
    <section id="get-started" className="bg-leaf-50/70 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-leaf-950 sm:text-4xl">Choose how you will use UploadHub</h2>
          <p className="mt-4 text-lg text-muted">Anyone can sign up as either. It takes a minute and there is no approval step.</p>
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {PATHS.map(({ role, icon: Icon, title, text, points }, index) => (
            <Reveal key={role} delay={index * 120}>
              <div className="flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-soft transition duration-300 hover:shadow-lift sm:p-8">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-600 text-white">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-2xl font-extrabold text-ink">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
                <ul className="mt-5 space-y-2.5">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-ink">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button to={`/signup/${role}`} className="sm:flex-1">
                    Sign up as {role === "admin" ? "an Admin" : "a User"}
                  </Button>
                  <Button to={`/signin/${role}`} variant="secondary" className="sm:flex-1">
                    {role === "admin" ? "Admin sign in" : "User sign in"}
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- HOW IT WORKS ----------
// These really are steps in order, so they are numbered.
const STEPS = [
  {
    title: "Create your account",
    text: "Sign up as a User, or as an Admin to create a department. You get your own workspace straight away.",
  },
  {
    title: "Join a department",
    text: "Search for your department by name or code and send a request. The Admin approves it, and you can still use your own workspace while you wait.",
  },
  {
    title: "Manage your files",
    text: "Upload, organise, preview and share. Department files follow the permissions the Admin has set for you.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-leaf-950 sm:text-4xl">From sign-up to shared files in three steps</h2>
        </Reveal>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 140} className="relative rounded-2xl border border-line bg-white p-7 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf-600 text-lg font-extrabold text-white">{index + 1}</span>
              <h3 className="mt-5 text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-muted">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------- SECURITY ----------
const SECURITY_POINTS = [
  { icon: Lock, title: "Private by default", text: "Department files are hidden from anyone who is not an approved member." },
  { icon: Fingerprint, title: "Checked on the server", text: "Every action is checked again by the server. Hiding a button is never what protects your files." },
  { icon: Link2, title: "Links that stay in your control", text: "Expiry and revocation are checked each time a link is opened, not just when it was made." },
  { icon: ClipboardList, title: "Nothing happens in secret", text: "Important actions are written to an audit trail that ordinary users cannot edit or delete." },
];

function Security() {
  return (
    <section id="security" className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-leaf-800 via-leaf-900 to-leaf-950 px-6 py-16 text-white sm:px-12 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 animate-float-slow rounded-full bg-leaf-400/15 blur-3xl" />
        <Reveal className="relative max-w-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Your files, protected where it counts</h2>
          <p className="mt-4 text-lg text-leaf-100">Security is not a screen you switch on. It is how every request is handled.</p>
        </Reveal>
        <div className="relative mt-12 grid gap-8 sm:grid-cols-2">
          {SECURITY_POINTS.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 100} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-1 text-leaf-100">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- FINAL CALL TO ACTION ----------
function FinalCta() {
  return (
    <section className="py-20 sm:py-24">
      <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-balance text-3xl font-extrabold text-leaf-950 sm:text-5xl">Give your files a proper home</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Create an account in a minute and start with your own workspace.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/signup/user" size="lg">
            Create a User account
          </Button>
          <Button to="/signup/admin" size="lg" variant="secondary">
            Register as an Admin
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted">
          Already registered?{" "}
          <Link to="/signin" className="inline-flex items-center gap-1 font-semibold text-leaf-800 hover:underline">
            Sign in <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Reveal>
    </section>
  );
}

export default function LandingPage() {
  useDocumentTitle("");
  return (
    <>
      <Hero />
      <Showcase />
      <Features />
      <ChoosePath />
      <HowItWorks />
      <Security />
      <FinalCta />
    </>
  );
}
