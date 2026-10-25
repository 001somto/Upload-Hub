// pages/user/UserDashboard.jsx
// WHAT THIS FILE IS: the first screen a User sees after signing in.
// WHAT IT DOES: greets them, shows a short "first steps" panel until they have done the
// steps or dismissed it, and shows their storage and department membership. The storage
// numbers come from the backend (api.storage.me); nothing is made up.

import { useState } from "react";
import { Link } from "react-router-dom";
import StorageOverview from "../../components/files/StorageOverview";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import { MEMBERSHIP_STATES } from "../../config/settings";
import { ArrowRight, Check, X } from "../../lib/icons";

const DISMISS_KEY = "uploadhub.onboarding.dismissed";

function readFlag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

// The three first steps. A step shows a tick once it is done.
function WelcomePanel({ fileCount, membershipState }) {
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISS_KEY));
  const steps = [
    { label: "Upload a file", to: "/app/files", done: Number(fileCount) > 0 },
    { label: "Create a folder", to: "/app/files", done: readFlag("uploadhub.onboarding.folder") },
    { label: "Find your department", to: "/app/department", done: membershipState && membershipState !== "independent" },
  ];

  if (dismissed || steps.every((step) => step.done)) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage may be blocked; the panel just hides for this visit.
    }
    setDismissed(true);
  }

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-leaf-700 to-leaf-900 p-6 text-white shadow-soft sm:p-7">
      <button type="button" onClick={dismiss} aria-label="Dismiss this panel" className="absolute right-3 top-3 rounded-lg p-1.5 text-leaf-100 transition hover:bg-white/10">
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <h2 className="text-xl font-extrabold">Get started in three steps</h2>
      <p className="mt-1 text-leaf-100">Your workspace is ready. Here is what most people do first.</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/20"
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-white text-leaf-800" : "border border-white/40"}`}>
                {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </span>
              <span className="flex-1">{step.label}</span>
              {step.done ? <span className="sr-only">Done</span> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function UserDashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const storage = useApiData(() => api.storage.me(), []);
  const state = MEMBERSHIP_STATES[user.membershipState] || MEMBERSHIP_STATES.independent;
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "there";

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your files, your storage and your department, all in one place."
        actions={
          <Button to="/app/files" icon={ArrowRight}>
            Open my files
          </Button>
        }
      />

      <WelcomePanel fileCount={storage.status === "ready" && storage.data ? storage.data.fileCount : null} membershipState={user.membershipState} />

      <Card className="mb-6">
        <CardHeader title="Your department" description="Department files are kept separate from your own workspace." />
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={state.tone}>{state.label}</Badge>
          <p className="text-sm text-muted">{state.help}</p>
          <Link to="/app/department" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-leaf-800 hover:underline">
            {user.membershipState === "active" ? "Open department" : "Find a department"} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Card>

      <DataBoundary result={storage} feature="Your storage overview" rows={4}>
        {(data) => <StorageOverview data={data} />}
      </DataBoundary>
    </div>
  );
}
