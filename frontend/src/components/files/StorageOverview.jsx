// components/files/StorageOverview.jsx
// WHAT THIS FILE IS: the "how much space have I used?" panel on the User dashboard.
// WHAT IT DOES: shows used space, the limit, what is left, the number of files, a
// breakdown by type and the latest uploads. Every number comes from the backend
// (api.storage.me). The limit (1 GB for Users, 5 GB for Admins) is decided by the server.

import { fileKind, formatBytes, formatDate, formatPercentUsed, percentUsed } from "../../lib/format";
import Card, { CardHeader } from "../ui/Card";
import { EmptyState } from "../ui/Feedback";
import StatCard from "../ui/StatCard";
import { Files, Gauge, HardDrive } from "../../lib/icons";
import FileIcon from "./FileIcon";

export function UsageBar({ used, limit }) {
  const percent = percentUsed(used, limit);
  const percentText = formatPercentUsed(used, limit);
  const visualWidth = used > 0 && percent < 1 ? Math.max(1, (used / limit) * 100) : percent;
  const tone = percent >= 95 ? "bg-red-500" : percent >= 80 ? "bg-sun" : "bg-leaf-500";
  return (
    <div>
      <div
        className="h-3 overflow-hidden rounded-full bg-leaf-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Storage used: ${percentText}`}
      >
        <div className={`h-full rounded-full transition-all duration-700 ${tone}`} style={{ width: `${visualWidth}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {percent >= 95 ? "Almost full. " : percent >= 80 ? "Getting full. " : ""}
        {percentText} used
      </p>
    </div>
  );
}

export default function StorageOverview({ data }) {
  const recent = data.recentUploads || [];
  // Totals by kind of file; the backend sends [{ type, bytes }] or nothing.
  const byType = (data.byType || []).filter((row) => Number(row.bytes) > 0);
  const largest = byType.reduce((max, row) => Math.max(max, Number(row.bytes)), 0) || 1;
  const remaining = data.remainingBytes != null ? data.remainingBytes : Math.max(0, data.limitBytes - data.usedBytes);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Your storage" description="Space used by files in your own workspace." />
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
        <StatCard icon={Files} label="Files" value={String(data.fileCount ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent uploads" />
          {recent.length === 0 ? (
            <EmptyState title="No uploads yet" body="Files you upload will show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.slice(0, 6).map((file) => (
                <li key={file.fileId} className="flex items-center gap-3 py-3">
                  <FileIcon contentType={file.contentType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                    <p className="text-xs text-muted">{formatDate(file.uploadedAt)}</p>
                  </div>
                  <span className="text-sm text-muted">{formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="What is taking the space" />
          {byType.length === 0 ? (
            <EmptyState title="Nothing to show yet" body="A breakdown by file type appears once you have uploaded files." />
          ) : (
            <ul className="space-y-4">
              {byType.map((row) => (
                <li key={row.type}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-ink">{row.type || fileKind("")}</span>
                    <span className="text-muted">{formatBytes(row.bytes)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-leaf-100">
                    <div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.max(3, (Number(row.bytes) / largest) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
