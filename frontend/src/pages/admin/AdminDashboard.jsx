// pages/admin/AdminDashboard.jsx
// WHAT THIS FILE IS: the first screen an Admin sees.
// WHAT IT DOES: shows a summary of the Admin's department: active members, storage used,
// pending join requests, a 30-day storage trend, recent uploads and recent admin actions.
// Every number comes from the backend. Each card loads on its own, so one failing does not
// hide the others. STATUS: PROVISIONAL endpoints (api.storage.department, api.audit.list,
// api.department.requests).

import { Link } from "react-router-dom";
import FileIcon from "../../components/files/FileIcon";
import { UsageBar } from "../../components/files/StorageOverview";
import Card, { CardHeader } from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { EmptyState } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import TrendChart from "../../components/ui/TrendChart";
import { useAuth } from "../../context/AuthContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import { describeAction } from "../../lib/audit";
import { formatBytes, formatDate, formatDateTime } from "../../lib/format";
import { ArrowRight, HardDrive, UserPlus, Users } from "../../lib/icons";

export default function AdminDashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const storage = useApiData(() => api.storage.department(30), []);
  const requests = useApiData(() => api.department.requests(), []);
  const actions = useApiData(() => api.audit.list({ page: 1, pageSize: 6 }), []);
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "there";

  return (
    <div>
      <PageHeader title={`Welcome, ${firstName}`} description="A summary of your department." />

      <div className="grid gap-4 sm:grid-cols-3">
        <DataBoundary result={storage} feature="Members" loading={<div className="h-32 animate-pulse rounded-2xl bg-leaf-100" />}>
          {(data) => <StatCard icon={Users} label="Active members" value={String(data.activeMembers ?? 0)} />}
        </DataBoundary>
        <DataBoundary result={storage} feature="Storage" loading={<div className="h-32 animate-pulse rounded-2xl bg-leaf-100" />}>
          {(data) => <StatCard icon={HardDrive} label="Department storage used" value={formatBytes(data.usedBytes)} detail={`of ${formatBytes(data.limitBytes)}`} />}
        </DataBoundary>
        <DataBoundary result={requests} feature="Join requests" loading={<div className="h-32 animate-pulse rounded-2xl bg-leaf-100" />}>
          {(data) => (
            <StatCard
              icon={UserPlus}
              label="Pending join requests"
              value={String((data.items || []).length)}
              detail={<Link className="font-semibold text-leaf-800 hover:underline" to="/admin/requests">Review requests</Link>}
            />
          )}
        </DataBoundary>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Storage over the last 30 days" actions={<Link to="/admin/analytics" className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-800 hover:underline">Full analytics <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>} />
          <DataBoundary result={storage} feature="The storage trend" rows={2}>
            {(data) => (
              <div className="space-y-5">
                <UsageBar used={data.usedBytes} limit={data.limitBytes} />
                <TrendChart data={data.trend} />
              </div>
            )}
          </DataBoundary>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent admin actions" actions={<Link to="/admin/audit" className="text-sm font-semibold text-leaf-800 hover:underline">Audit trail</Link>} />
          <DataBoundary
            result={actions}
            feature="Recent actions"
            rows={3}
            isEmpty={(data) => !data || (data.items || []).length === 0}
            empty={<EmptyState title="Nothing recorded yet" body="Actions in your department will appear here." />}
          >
            {(data) => (
              <ul className="divide-y divide-line">
                {data.items.map((item) => (
                  <li key={item.logId} className="py-3 text-sm">
                    <p className="text-ink">
                      <span className="font-semibold">{item.userName}</span> <span className="text-muted">{describeAction(item.action).toLowerCase()}</span>
                      {item.target ? <span className="text-ink">: {item.target}</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(item.timestamp)}</p>
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent uploads" actions={<Link to="/admin/files" className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-800 hover:underline">Department files <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>} />
        <DataBoundary
          result={storage}
          feature="Recent uploads"
          rows={3}
          isEmpty={(data) => !data || (data.recentUploads || []).length === 0}
          empty={<EmptyState title="No uploads yet" body="Files added to the department will appear here." />}
        >
          {(data) => (
            <ul className="divide-y divide-line">
              {data.recentUploads.slice(0, 6).map((file) => (
                <li key={file.fileId} className="flex items-center gap-3 py-3">
                  <FileIcon contentType={file.contentType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                    <p className="text-xs text-muted">
                      {file.ownerName ? `${file.ownerName}, ` : ""}
                      {formatDate(file.uploadedAt)}
                    </p>
                  </div>
                  <span className="text-sm text-muted">{formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </DataBoundary>
      </Card>
    </div>
  );
}
