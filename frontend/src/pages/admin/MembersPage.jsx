// pages/admin/MembersPage.jsx
// WHAT THIS FILE IS: the Members screen for Admins - the people in the Admin's department.
// WHAT IT DOES: a searchable, filterable, paged table of members with, for each one:
//   View details, Manage permissions, Pause or restore access, and Remove from department.
// Tick several members to give them all the same permissions in one go (bulk).
// "Pause access" only stops a member's access to department files; they can still sign in
// and use their own workspace. The backend enforces everything: this screen only asks.
// STATUS: PROVISIONAL endpoints (api.department.*).

import { useEffect, useState } from "react";
import Avatar from "../../components/ui/Avatar";
import ActionMenu from "../../components/ui/ActionMenu";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { CheckboxField, SelectField } from "../../components/ui/Fields";
import { EmptyState, InlineAlert } from "../../components/ui/Feedback";
import Modal, { ConfirmDialog } from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import { MEMBERSHIP_STATES, PERMISSIONS } from "../../config/settings";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api, isNotConnected } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { Search, Settings, UserCheck, UserX, Users } from "../../lib/icons";

const PAGE_SIZE = 20;

function errorText(error) {
  if (isNotConnected(error)) return "This is not connected to the server yet.";
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

// The pop-up for choosing permissions for one member, or for many at once.
function PermissionsDialog({ open, onClose, title, description, initial, onSave }) {
  const [chosen, setChosen] = useState(new Set(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setChosen(new Set(initial));
      setBusy(false);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function flip(key) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave([...chosen]);
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save permissions
          </Button>
        </>
      }
    >
      {error ? <InlineAlert tone="error" className="mb-4">{error}</InlineAlert> : null}
      <div className="space-y-4">
        {PERMISSIONS.map((permission) => (
          <CheckboxField
            key={permission.key}
            label={permission.label}
            description={permission.description}
            checked={chosen.has(permission.key)}
            onChange={() => flip(permission.key)}
          />
        ))}
      </div>
    </Modal>
  );
}

export default function MembersPage() {
  useDocumentTitle("Members");
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const result = useApiData(() => api.department.members({ q: search, status, page, pageSize: PAGE_SIZE }), [search, status, page]);

  // Go back to page 1 and clear ticks whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status]);
  useEffect(() => setSelected(new Set()), [search, status, page]);

  const members = (result.data && result.data.items) || [];
  const allSelected = members.length > 0 && members.every((member) => selected.has(member.userId));

  function toggle(userId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function run(action, title) {
    setBusy(true);
    try {
      await action();
      toast({ title });
      setDialog(null);
      result.reload();
    } catch (error) {
      toast({ title: "That did not work", message: errorText(error), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function memberActions(member) {
    const paused = member.status === "disabled";
    return [
      { label: "View details", icon: Users, onClick: () => setDialog({ type: "details", member }) },
      { label: "Manage permissions", icon: Settings, onClick: () => setDialog({ type: "permissions", member }) },
      paused
        ? { label: "Restore access", icon: UserCheck, onClick: () => run(() => api.department.setMemberStatus(member.userId, "active"), "Access restored") }
        : { label: "Pause access", icon: UserX, onClick: () => setDialog({ type: "pause", member }) },
      { label: "Remove from department", icon: UserX, tone: "danger", onClick: () => setDialog({ type: "remove", member }) },
    ];
  }

  const target = dialog && dialog.member;

  return (
    <div>
      <PageHeader title="Members" description="People in your department. Pausing access stops their access to department files only." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search members"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm placeholder:text-muted/70 hover:border-leaf-300 focus:border-leaf-600 focus:outline-none focus:ring-4 focus:ring-leaf-100"
          />
        </div>
        <div className="sm:w-52">
          <SelectField aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All members</option>
            <option value="active">Access active</option>
            <option value="disabled">Access paused</option>
          </SelectField>
        </div>
      </div>

      {selected.size > 0 ? (
        <div role="region" aria-label="Selected members" className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-leaf-900 px-4 py-3 text-white">
          <span className="mr-auto text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="onDark" icon={Settings} onClick={() => setDialog({ type: "bulk" })}>
            Set permissions for all
          </Button>
          <Button size="sm" variant="outlineOnDark" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        <DataBoundary
          result={result}
          feature="Your members"
          showStale
          rows={4}
          isEmpty={(data) => !data || (data.items || []).length === 0}
          empty={
            <EmptyState
              icon={Users}
              title={search || status ? "No members match" : "No members yet"}
              body={search || status ? "Try a different search or filter." : "When people join your department they will appear here. Share your department code so they can find you."}
            />
          }
        >
          {(data) => (
            <Card padded={false}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="border-b border-line bg-leaf-50/70 text-xs font-semibold text-muted">
                    <tr>
                      <th scope="col" className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(members.map((member) => member.userId)))}
                          aria-label="Select all members on this page"
                          className="h-4 w-4 cursor-pointer rounded accent-leaf-600"
                        />
                      </th>
                      <th scope="col" className="px-2 py-3">Member</th>
                      <th scope="col" className="px-2 py-3">Access</th>
                      <th scope="col" className="hidden px-2 py-3 md:table-cell">Membership</th>
                      <th scope="col" className="hidden px-2 py-3 lg:table-cell">Joined</th>
                      <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((member) => {
                      const state = MEMBERSHIP_STATES[member.membershipState] || MEMBERSHIP_STATES.active;
                      return (
                        <tr key={member.userId} className={selected.has(member.userId) ? "bg-leaf-50" : "hover:bg-leaf-50/50"}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(member.userId)}
                              onChange={() => toggle(member.userId)}
                              aria-label={`Select ${member.name}`}
                              className="h-4 w-4 cursor-pointer rounded accent-leaf-600"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.name} className="h-9 w-9 text-xs" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-ink">{member.name}</p>
                                <p className="truncate text-xs text-muted">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <Badge tone={member.status === "disabled" ? "amber" : "green"}>{member.status === "disabled" ? "Paused" : "Active"}</Badge>
                          </td>
                          <td className="hidden px-2 py-3 md:table-cell">
                            <Badge tone={state.tone}>{state.label}</Badge>
                          </td>
                          <td className="hidden px-2 py-3 text-muted lg:table-cell">{formatDate(member.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <ActionMenu label={`Actions for ${member.name}`} items={memberActions(member)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-4">
                <Pagination page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPageChange={setPage} />
              </div>
            </Card>
          )}
        </DataBoundary>
      </div>

      {/* ----- dialogs ----- */}
      <Modal
        open={Boolean(dialog && dialog.type === "details")}
        onClose={() => setDialog(null)}
        title={target ? target.name : ""}
        description={target ? target.email : ""}
        size="sm"
        footer={<Button onClick={() => setDialog(null)}>Close</Button>}
      >
        {target ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Account type</dt><dd className="font-semibold text-ink">{target.role === "admin" ? "Admin" : "User"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Joined</dt><dd className="font-semibold text-ink">{formatDate(target.createdAt)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Department access</dt><dd className="font-semibold text-ink">{target.status === "disabled" ? "Paused" : "Active"}</dd></div>
            <div>
              <dt className="text-muted">Permissions</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {PERMISSIONS.filter((permission) => (target.permissions || []).includes(permission.key)).map((permission) => (
                  <Badge key={permission.key} tone="green">{permission.label}</Badge>
                ))}
                {(target.permissions || []).length === 0 ? <span className="text-muted">None set</span> : null}
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <PermissionsDialog
        open={Boolean(dialog && dialog.type === "permissions")}
        onClose={() => setDialog(null)}
        title={target ? `Permissions for ${target.name}` : "Permissions"}
        description="Choose what this member can do in department files."
        initial={target && target.permissions ? target.permissions : ["download"]}
        onSave={async (permissions) => {
          await api.department.setPermissions(target.userId, { permissions });
          toast({ title: "Permissions saved" });
          setDialog(null);
          result.reload();
        }}
      />

      <PermissionsDialog
        open={Boolean(dialog && dialog.type === "bulk")}
        onClose={() => setDialog(null)}
        title={`Permissions for ${selected.size} members`}
        description="This replaces each selected member's current permissions with the ones you choose."
        initial={["download"]}
        onSave={async (permissions) => {
          await api.department.bulkPermissions({ userIds: [...selected], permissions });
          toast({ title: "Permissions saved", message: `Updated ${selected.size} members.` });
          setDialog(null);
          setSelected(new Set());
          result.reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(dialog && dialog.type === "pause")}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => api.department.setMemberStatus(target.userId, "disabled"), "Access paused")}
        loading={busy}
        tone="primary"
        title={`Pause access for ${target ? target.name : ""}?`}
        message="They will not be able to open department files. They can still sign in and use their own workspace. You can restore access any time."
        confirmLabel="Pause access"
      />

      <ConfirmDialog
        open={Boolean(dialog && dialog.type === "remove")}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => api.department.removeMember(target.userId), "Member removed")}
        loading={busy}
        title={`Remove ${target ? target.name : ""} from the department?`}
        message="They lose access to department files straight away. Their own files stay in their workspace, and they can ask to join again."
        confirmLabel="Remove member"
      />
    </div>
  );
}
