// pages/admin/AnalyticsPage.jsx
// WHAT THIS FILE IS: "Storage analytics" for Admins.
// WHAT IT DOES: shows how much of the department's storage is used and what remains, the
// number of active members, usage by member, a trend you can switch between 7, 30 and 90
// days, and recent uploads. Department storage is counted separately from anyone's own
// workspace. All numbers come from the backend; nothing is invented.
// STATUS: PROVISIONAL endpoint (api.storage.department).

import { useState } from "react";
import FileIcon from "../../components/files/FileIcon";
import { UsageBar } from "../../components/files/StorageOverview";
import Avatar from "../../components/ui/Avatar";
import Card, { CardHeader } from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { EmptyState } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Tabs from "../../components/ui/Tabs";
import TrendChart from "../../components/ui/TrendChart";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import { formatBytes, formatDate } from "../../lib/format";
import { Gauge, HardDrive, Users } from "../../lib/icons";

export default function AnalyticsPage() {
  useDocumentTitle("Storage analytics");
  const [days, setDays] = useState(30);
  const result = useApiData(() => api.storage.department(days), [days]);

  return (
    <div>
      <PageHeader title="Storage analytics" description="How your department's storage is used. This is separate from your own workspace." />
      <DataBoundary result={result} feature="Storage analytics" showStale rows={4}>
        {(data) => {
          const remaining = data.remainingBytes != null ? data.remainingBytes : Math.max(0, data.limitBytes - data.usedBytes);
          const byMember = [...(data.byMember || [])].sort((a, b) => Number(b.bytes) - Number(a.bytes));
          const largest = byMember.length > 0 ? Number(byMember[0].bytes) || 1 : 1;
          return (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Department storage" />
                <p className="text-3xl font-extrabold text-ink">
                  {formatBytes(data.usedBytes)} <span className="text-lg font-semibold text-muted">of {formatBytes(data.limitBytes)}</span>
                </p>
                <div className="mt-4">
                  <UsageBar used={data.usedBytes} limit={data.limitBytes} />
                </div>
              </Card>

              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={HardDrive} label="Used" value={formatBytes(data.usedBytes)} />
                <StatCard icon={Gauge} label="Remaining" value={formatBytes(remaining)} />
                <StatCard icon={Users} label="Active members" value={String(data.activeMembers ?? 0)} />
              </div>

              <Card>
                <CardHeader
                  title="Storage trend"
                  actions={
                    <Tabs
                      label="Time range"
                      value={days}
                      onChange={setDays}
                      items={[
                        { key: 7, label: "7 days" },
                        { key: 30, label: "30 days" },
                        { key: 90, label: "90 days" },
                      ]}
                    />
                  }
                />
                <TrendChart data={data.trend} />
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Usage by member" />
                  {byMember.length === 0 ? (
                    <EmptyState title="Nothing to show yet" body="Usage by member appears once members have uploaded files." />
                  ) : (
                    <ul className="space-y-4">
                      {byMember.map((member) => (
                        <li key={member.userId}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Avatar name={member.name} className="h-7 w-7 text-[10px]" />
                              <span className="truncate font-medium text-ink">{member.name}</span>
                            </span>
                            <span className="shrink-0 text-muted">{formatBytes(member.bytes)}</span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-leaf-100">
                            <div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.max(3, (Number(member.bytes) / largest) * 100)}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Recent uploads" />
                  {(data.recentUploads || []).length === 0 ? (
                    <EmptyState title="No uploads yet" body="Files added to the department will appear here." />
                  ) : (
                    <ul className="divide-y divide-line">
                      {data.recentUploads.slice(0, 8).map((file) => (
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
                </Card>
              </div>
            </div>
          );
        }}
      </DataBoundary>
    </div>
  );
}
