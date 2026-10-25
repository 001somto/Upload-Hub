// pages/user/DepartmentPage.jsx
// WHAT THIS FILE IS: the Department screen for Users.
// WHAT IT DOES: depends on where the person stands:
//   Independent / Rejected / Removed -> search the directory, or type a department code
//                                       (needed for hidden departments), then request to join
//   Pending -> shows the request and lets them cancel it
//   Active  -> shows the department, what they are allowed to do, a Leave button, and a
//              second tab with the department's files
// The person's own workspace is never affected by any of these states.
// STATUS: PROVISIONAL endpoints (api.departments.*). The backend decides everything; this
// screen only asks and shows the answer.

import { useState } from "react";
import FileBrowser from "../../components/files/FileBrowser";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { TextField } from "../../components/ui/Fields";
import { EmptyState, InlineAlert } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import { MEMBERSHIP_STATES, PERMISSIONS } from "../../config/settings";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api, isNotConnected } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { Building2, Check, Lock, Search } from "../../lib/icons";

// Search the directory, or join with a code.
function Directory({ onRequest, busy }) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query);
  const [code, setCode] = useState("");
  const results = useApiData(() => api.departments.search(debounced), [debounced]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Find your department" description="Search by department name or code, then send a request to join." />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example Computer Science or CSC"
            aria-label="Search departments"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm placeholder:text-muted/70 hover:border-leaf-300 focus:border-leaf-600 focus:outline-none focus:ring-4 focus:ring-leaf-100"
          />
        </div>
        <div className="mt-4">
          <DataBoundary
            result={results}
            feature="The department directory"
            showStale
            isEmpty={(data) => !data || (data.items || []).length === 0}
            empty={
              <EmptyState
                icon={Building2}
                title={debounced ? "No departments match" : "No departments are listed yet"}
                body="Departments can be hidden from search. If yours is, ask its Admin for the code and use the box below."
              />
            }
          >
            {(data) => (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {data.items.map((department) => (
                  <li key={department.departmentId} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf-100 text-leaf-800">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {department.name} <span className="font-normal text-muted">({department.code})</span>
                      </p>
                      <p className="text-sm text-muted">Admin: {department.adminName}</p>
                    </div>
                    <Button variant="secondary" size="sm" loading={busy} onClick={() => onRequest({ departmentId: department.departmentId })}>
                      Request to join
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </div>
      </Card>

      <Card>
        <CardHeader title="Have a department code?" description="Use this for departments that are hidden from search." />
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) onRequest({ code: code.trim() });
          }}
        >
          <TextField
            label="Department code"
            className="flex-1"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
            placeholder="CSC"
            inputClassName="uppercase tracking-wider"
          />
          <Button type="submit" disabled={!code.trim()} loading={busy}>
            Request to join
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function DepartmentPage() {
  useDocumentTitle("Department");
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const membership = useApiData(() => api.departments.membership(), []);
  const [tab, setTab] = useState("membership");
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Runs one action, then refreshes both this screen and the signed-in account.
  async function run(action, successTitle) {
    setBusy(true);
    try {
      await action();
      toast({ title: successTitle });
      membership.reload();
      refreshUser().catch(() => {});
      setConfirmLeave(false);
      setTab("membership");
    } catch (error) {
      toast({
        title: "That did not work",
        message: isNotConnected(error) ? "This is not connected to the server yet." : error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const state = membership.status === "ready" && membership.data ? membership.data.state : null;
  const isActive = state === "active";

  return (
    <div>
      <PageHeader title="Department" description="Join a department to reach its shared files. Your own workspace is always yours." />

      {isActive ? (
        <div className="mb-6">
          <Tabs
            label="Department sections"
            value={tab}
            onChange={setTab}
            items={[
              { key: "membership", label: "Membership" },
              { key: "files", label: "Department files" },
            ]}
          />
        </div>
      ) : null}

      <DataBoundary result={membership} feature="Department membership" rows={3}>
        {(data) => {
          const info = MEMBERSHIP_STATES[data.state] || MEMBERSHIP_STATES.independent;
          const department = data.department;

          if (data.state === "active" && tab === "files") return <FileBrowser scope="department" />;

          if (data.state === "active") {
            const allowed = new Set(data.permissions || ["download"]);
            return (
              <div className="space-y-6">
                <Card>
                  <CardHeader title={department ? department.name : "Your department"} actions={<Badge tone={info.tone}>{info.label}</Badge>} />
                  <p className="text-sm text-muted">
                    {department ? `Code ${department.code}. Admin: ${department.adminName}.` : info.help}
                  </p>
                  <h3 className="mt-6 text-sm font-bold text-ink">What you can do here</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PERMISSIONS.map((permission) => {
                      const has = allowed.has(permission.key);
                      return (
                        <li key={permission.key} className={`flex items-start gap-3 rounded-xl border p-3 ${has ? "border-leaf-200 bg-leaf-50" : "border-line"}`}>
                          {has ? <Check className="mt-0.5 h-4 w-4 text-leaf-700" aria-hidden="true" /> : <Lock className="mt-0.5 h-4 w-4 text-muted" aria-hidden="true" />}
                          <span className="text-sm">
                            <span className="block font-semibold text-ink">
                              {permission.label} <span className="sr-only">{has ? "(allowed)" : "(not allowed)"}</span>
                            </span>
                            <span className="text-muted">{permission.description}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => setTab("files")}>Open department files</Button>
                    <Button variant="dangerSoft" onClick={() => setConfirmLeave(true)}>
                      Leave department
                    </Button>
                  </div>
                </Card>
              </div>
            );
          }

          if (data.state === "pending") {
            return (
              <Card>
                <CardHeader title="Your request is waiting" actions={<Badge tone={info.tone}>{info.label}</Badge>} />
                <p className="text-sm text-muted">
                  {department ? `You asked to join ${department.name} (${department.code})` : "You asked to join a department"}
                  {data.requestedAt ? ` on ${formatDateTime(data.requestedAt)}` : ""}. The Admin will approve or reject it. You can keep using your own workspace in the meantime.
                </p>
                <Button className="mt-5" variant="secondary" loading={busy} onClick={() => run(() => api.departments.cancelRequest(), "Request cancelled")}>
                  Cancel request
                </Button>
              </Card>
            );
          }

          // Independent, rejected or removed: show how to join.
          return (
            <div className="space-y-6">
              {data.state === "rejected" || data.state === "removed" ? (
                <InlineAlert tone="warning" title={info.label}>
                  {info.help}
                </InlineAlert>
              ) : null}
              <Directory busy={busy} onRequest={(body) => run(() => api.departments.requestToJoin(body), "Request sent")} />
            </div>
          );
        }}
      </DataBoundary>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => run(() => api.departments.leave(), "You left the department")}
        loading={busy}
        title="Leave this department?"
        message="You will lose access to its files straight away. Your own files stay in your workspace, and you can ask to join again later."
        confirmLabel="Leave department"
      />
    </div>
  );
}
