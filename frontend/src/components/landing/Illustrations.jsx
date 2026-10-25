// components/landing/Illustrations.jsx
// WHAT THIS FILE IS: the little pictures of the app shown on the landing page.
// WHAT IT DOES: draws framed "screens" (a file browser, a share dialog, storage charts,
// an audit trail) using ordinary HTML and CSS - no image files. They are DESIGNED
// ILLUSTRATIONS to show visitors what UploadHub looks like. They are not the app, they
// hold no real data, and they are hidden from screen readers (the text around them says
// what each one shows). The signed-in app itself never shows made-up numbers.

import {
  CircleCheck, CloudUpload, Copy, File, FileText, FolderOpen, Gauge, ImageIcon, LayoutDashboard,
  Link2, Search, Settings, Share2, Users, Folder,
} from "../../lib/icons";
import { LogoMark } from "../ui/Logo";

// The frame that makes content look like a browser window.
export function WindowFrame({ children, address = "uploadhub.app", className = "" }) {
  return (
    <div aria-hidden="true" className={`overflow-hidden rounded-2xl border border-line bg-white shadow-window ${className}`}>
      <div className="flex items-center gap-3 border-b border-line bg-leaf-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-leaf-300" />
        </div>
        <div className="mx-auto flex h-6 w-full max-w-[16rem] items-center justify-center rounded-md bg-white text-[11px] text-muted ring-1 ring-line">
          {address}
        </div>
        <span className="w-10" />
      </div>
      {children}
    </div>
  );
}

// A mini sidebar used inside the illustrated screens.
function MiniSidebar({ active }) {
  const items = [
    { icon: LayoutDashboard, key: "dash" },
    { icon: FolderOpen, key: "files" },
    { icon: Users, key: "people" },
    { icon: Share2, key: "share" },
    { icon: Gauge, key: "storage" },
    { icon: Settings, key: "settings" },
  ];
  return (
    <div className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r border-line bg-white py-4 sm:flex">
      <LogoMark className="mb-2 h-7 w-7" />
      {items.map(({ icon: Icon, key }) => (
        <span key={key} className={`flex h-9 w-9 items-center justify-center rounded-xl ${key === active ? "bg-leaf-100 text-leaf-800" : "text-muted/70"}`}>
          <Icon className="h-4 w-4" />
        </span>
      ))}
    </div>
  );
}

const ROWS = [
  { name: "Admissions 2026", kind: "folder", meta: "14 items", date: "24 Oct" },
  { name: "Course registration.pdf", kind: "pdf", meta: "1.2 MB", date: "23 Oct" },
  { name: "Lecture timetable.xlsx", kind: "doc", meta: "340 KB", date: "21 Oct" },
  { name: "Campus map.png", kind: "image", meta: "2.8 MB", date: "19 Oct" },
  { name: "Faculty minutes.docx", kind: "doc", meta: "88 KB", date: "17 Oct" },
];

function RowIcon({ kind }) {
  const common = "h-4 w-4";
  if (kind === "folder") return <Folder className={`${common} text-leaf-700`} />;
  if (kind === "pdf") return <FileText className={`${common} text-red-500`} />;
  if (kind === "image") return <ImageIcon className={`${common} text-sky-500`} />;
  return <File className={`${common} text-leaf-600`} />;
}

// Slide 1 (and the hero): the file browser.
export function FilesScreen({ compact = false }) {
  return (
    <div className="flex">
      <MiniSidebar active="files" />
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-muted">
            Department files <span className="mx-1 text-line">/</span> <span className="font-semibold text-ink">2026</span>
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-leaf-600 px-2.5 py-1.5 text-[11px] font-semibold text-white">
            <CloudUpload className="h-3.5 w-3.5" /> Upload
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted/80">
          <Search className="h-3.5 w-3.5" /> Search files
        </div>
        <ul className="mt-3 divide-y divide-line">
          {ROWS.slice(0, compact ? 4 : 5).map((row, index) => (
            <li key={row.name} className={`flex items-center gap-3 px-1 py-2.5 text-xs ${index === 1 ? "rounded-lg bg-leaf-50" : ""}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${index === 1 ? "border-leaf-600 bg-leaf-600" : "border-line"}`}>
                {index === 1 ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <RowIcon kind={row.kind} />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.name}</span>
              <span className="hidden w-16 text-right text-muted sm:block">{row.meta}</span>
              <span className="hidden w-12 text-right text-muted md:block">{row.date}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Slide 2: creating a share link.
export function ShareScreen() {
  const options = ["1 day", "7 days", "30 days", "Custom"];
  return (
    <div className="flex">
      <MiniSidebar active="share" />
      <div className="min-w-0 flex-1 bg-leaf-50/60 p-4 sm:p-6">
        <div className="mx-auto max-w-sm rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ink">Share a file</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-leaf-50 p-3">
            <FileText className="h-5 w-5 text-red-500" />
            <div className="min-w-0 text-xs">
              <p className="truncate font-semibold text-ink">Course registration.pdf</p>
              <p className="text-muted">1.2 MB</p>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-ink">Link expires after</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[11px] font-semibold">
            {options.map((option) => (
              <span key={option} className={`rounded-lg px-1 py-2 ${option === "7 days" ? "bg-leaf-600 text-white" : "bg-leaf-50 text-muted"}`}>
                {option}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line p-1.5 pl-3 text-xs">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-muted">uploadhub.app/share/k3x9...</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-leaf-100 px-2 py-1.5 font-semibold text-leaf-800">
              <Copy className="h-3 w-3" /> Copy
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-xs">
            {[
              ["Timetable.xlsx", "Active", "bg-leaf-100 text-leaf-800"],
              ["Old brochure.pdf", "Expired", "bg-amber-50 text-amber-800"],
              ["Draft memo.docx", "Revoked", "bg-red-50 text-red-700"],
            ].map(([name, status, tone]) => (
              <li key={name} className="flex items-center justify-between">
                <span className="truncate text-muted">{name}</span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${tone}`}>{status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Slide 3: storage analytics.
export function StorageScreen() {
  const members = [
    ["Ada Eze", 78],
    ["Tunde Bello", 54],
    ["Ngozi Okafor", 36],
    ["Musa Danjuma", 21],
  ];
  const points = [10, 14, 13, 19, 24, 23, 30, 34, 33, 41, 47, 52];
  const max = 60;
  const path = points.map((value, index) => `${index === 0 ? "M" : "L"}${(index / (points.length - 1)) * 220} ${70 - (value / max) * 64}`).join(" ");
  return (
    <div className="flex">
      <MiniSidebar active="storage" />
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-4 rounded-xl border border-line p-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#eaf6ec" strokeWidth="5" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#388e3c" strokeWidth="5" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="34" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">64%</span>
            </div>
            <div className="text-xs">
              <p className="font-bold text-ink">Department storage</p>
              <p className="text-muted">Used and remaining</p>
            </div>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs font-bold text-ink">Storage over 30 days</p>
            <svg viewBox="0 0 220 76" className="mt-2 h-16 w-full" preserveAspectRatio="none">
              <path d={`${path} L220 76 L0 76 Z`} fill="#c8e6c9" opacity="0.55" />
              <path d={path} fill="none" stroke="#388e3c" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-line p-4">
          <p className="text-xs font-bold text-ink">Usage by member</p>
          <ul className="mt-3 space-y-2.5">
            {members.map(([name, width]) => (
              <li key={name} className="flex items-center gap-3 text-xs">
                <span className="w-24 truncate text-muted">{name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-leaf-100">
                  <span className="block h-full rounded-full bg-leaf-500" style={{ width: `${width}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Slide 4: the audit trail.
export function AuditScreen() {
  const events = [
    ["Ada Eze", "uploaded", "Course registration.pdf", "10:42", "bg-leaf-500"],
    ["Admin", "approved", "Tunde Bello's request", "10:15", "bg-sky-500"],
    ["Ngozi Okafor", "created a share link for", "Timetable.xlsx", "09:58", "bg-amber-500"],
    ["Musa Danjuma", "downloaded", "Campus map.png", "09:31", "bg-leaf-500"],
    ["Admin", "changed permissions for", "3 members", "09:02", "bg-sky-500"],
  ];
  return (
    <div className="flex">
      <MiniSidebar active="people" />
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          <span className="rounded-lg border border-line px-2.5 py-1.5 text-muted">Everyone</span>
          <span className="rounded-lg border border-line px-2.5 py-1.5 text-muted">All actions</span>
          <span className="rounded-lg border border-line px-2.5 py-1.5 text-muted">Last 7 days</span>
        </div>
        <ol className="mt-4 space-y-3.5">
          {events.map(([who, did, what, time, dot]) => (
            <li key={`${who}-${time}`} className="flex items-start gap-3 text-xs">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <p className="min-w-0 flex-1 text-muted">
                <span className="font-semibold text-ink">{who}</span> {did} <span className="font-medium text-ink">{what}</span>
              </p>
              <span className="shrink-0 text-muted/80">{time}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// Floating status cards used around the hero picture.
export function FloatingUpload({ className = "" }) {
  return (
    <div aria-hidden="true" className={`w-56 rounded-2xl border border-line bg-white p-3.5 shadow-lift ${className}`}>
      <div className="flex items-center gap-2.5 text-xs">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-100 text-leaf-700">
          <CloudUpload className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">Results 2026.pdf</p>
          <p className="text-muted">Uploading, 72%</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-leaf-100">
        <div className="h-full w-[72%] rounded-full bg-leaf-500" />
      </div>
    </div>
  );
}

export function FloatingShare({ className = "" }) {
  return (
    <div aria-hidden="true" className={`flex w-60 items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-lift ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
        <Link2 className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-xs">
        <p className="font-semibold text-ink">Share link ready</p>
        <p className="text-muted">Expires in 7 days</p>
      </div>
    </div>
  );
}

export function FloatingApproved({ className = "" }) {
  return (
    <div aria-hidden="true" className={`flex w-56 items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-lift ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf-100 text-leaf-700">
        <CircleCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-xs">
        <p className="font-semibold text-ink">Request approved</p>
        <p className="text-muted">You joined your department</p>
      </div>
    </div>
  );
}

