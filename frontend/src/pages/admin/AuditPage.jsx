// pages/admin/AuditPage.jsx
// WHAT THIS FILE IS: the "Audit trail" for Admins.
// WHAT IT DOES: a read-only, newest-first list of what happened in the Admin's own
// department - who did what and when. Filter by person, action and dates; 20 per page.
// There is no edit, delete or export: the record is kept by the server and cannot be
// changed from here.

import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { SelectField, TextField } from "../../components/ui/Fields";
import { EmptyState } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import { AUDIT_ACTIONS, describeAction } from "../../lib/audit";
import { formatDateTime } from "../../lib/format";
import { ClipboardList } from "../../lib/icons";

const PAGE_SIZE = 20;

function RoleBadge({ role }) {
  if (role === "admin") return <Badge tone="blue">Admin</Badge>;
  return <Badge tone="neutral">User</Badge>;
}

export default function AuditPage() {
  useDocumentTitle("Audit trail");
  const [filters, setFilters] = useState({ userId: "", action: "", from: "", to: "" });
  const [page, setPage] = useState(1);

  // The people drop-down is filled from the member list (if it can be loaded).
  const people = useApiData(() => api.department.members({ page: 1, pageSize: 100 }), []);
  const result = useApiData(
    () => api.audit.list({ userId: filters.userId, action: filters.action, from: filters.from, to: filters.to, page, pageSize: PAGE_SIZE }),
    [filters.userId, filters.action, filters.from, filters.to, page]
  );

  useEffect(() => setPage(1), [filters.userId, filters.action, filters.from, filters.to]);

  function update(field) {
    return (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  }

  const memberOptions = people.status === "ready" && people.data ? people.data.items || [] : [];
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div>
      <PageHeader title="Audit trail" description="What has happened in your department. This record is read-only." />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Person" value={filters.userId} onChange={update("userId")}>
            <option value="">Everyone</option>
            {memberOptions.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Action" value={filters.action} onChange={update("action")}>
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action.key} value={action.key}>
                {action.label}
              </option>
            ))}
          </SelectField>
          <TextField label="From" type="date" value={filters.from} max={filters.to || undefined} onChange={update("from")} />
          <TextField label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={update("to")} />
        </div>
      </Card>

      <DataBoundary
        result={result}
        feature="The audit trail"
        showStale
        isEmpty={(data) => !data || (data.items || []).length === 0}
        empty={
          <EmptyState
            icon={ClipboardList}
            title={filtered ? "Nothing matches those filters" : "Nothing recorded yet"}
            body={filtered ? "Try widening the dates or choosing all actions." : "Actions in your department will be recorded here."}
          />
        }
      >
        {(data) => (
          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <thead className="border-b border-line bg-leaf-50/70 text-xs font-semibold text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">When</th>
                    <th scope="col" className="px-3 py-3">Who</th>
                    <th scope="col" className="px-3 py-3">Role</th>
                    <th scope="col" className="px-3 py-3">What happened</th>
                    <th scope="col" className="px-5 py-3">On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((item) => (
                    <tr key={item.logId}>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">
                        <time dateTime={item.timestamp}>{formatDateTime(item.timestamp)}</time>
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink">{item.userName}</td>
                      <td className="px-3 py-3">
                        <RoleBadge role={item.userRole} />
                      </td>
                      <td className="px-3 py-3 text-ink">{describeAction(item.action)}</td>
                      <td className="px-5 py-3 text-muted">{item.target || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4">
              <Pagination page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPageChange={setPage} />
            </div>
          </Card>
        )}
      </DataBoundary>
    </div>
  );
}
