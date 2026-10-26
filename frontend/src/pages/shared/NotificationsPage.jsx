// pages/shared/NotificationsPage.jsx
// WHAT THIS FILE IS: the Notifications screen, used by both Users and Admins.
// WHAT IT DOES: lists notifications from the backend (upload confirmations, link expiry
// reminders, membership decisions, security messages). Unread ones are marked; people can
// mark one or all as read. Email delivery is a separate matter handled by the backend: this
// page only shows notifications the backend has stored, and never claims an email was sent.
// STATUS: PROVISIONAL endpoints (api.notifications.*).

import { RefreshCw } from "../../lib/icons";
import { useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { EmptyState } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { Bell } from "../../lib/icons";

export default function NotificationsPage() {
  useDocumentTitle("Notifications");
  const { user } = useAuth();
  const { toast } = useToast();
  const result = useApiData(() => api.notifications.list(), []);
  const [busy, setBusy] = useState(false);
  const settingsPath = user.role === "admin" ? "/admin/settings" : "/app/settings";

  async function markRead(body) {
    setBusy(true);
    try {
      await api.notifications.markRead(body);
      result.reload();
    } catch (error) {
      toast({ title: "That did not work", message: error instanceof ApiError ? error.message : "Something went wrong.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const unread = result.status === "ready" && result.data ? result.data.unreadCount || 0 : 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your uploads, share links, membership and account."
        actions={
          <>
            <Button to={settingsPath} variant="secondary">
              Notification settings
            </Button>
            <Button variant="soft" loading={result.status === "loading"} onClick={() => result.reload()} title="Refresh notifications">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="soft" disabled={unread === 0} loading={busy} onClick={() => markRead({ all: true })}>
              Mark all as read
            </Button>
          </>
        }
      />
      <DataBoundary
        result={result}
        feature="Your notifications"
        isEmpty={(data) => !data || (data.items || []).length === 0}
        empty={<EmptyState icon={Bell} title="You are all caught up" body="New notifications will show up here." />}
      >
        {(data) => (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {data.items.map((item) => (
                <li key={item.notificationId} className={`flex items-start gap-3 px-5 py-4 ${item.read ? "" : "bg-leaf-50/70"}`}>
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-leaf-600"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${item.read ? "text-muted" : "font-semibold text-ink"}`}>
                      {item.message}
                      {!item.read ? <span className="sr-only"> (unread)</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(item.timestamp)}</p>
                  </div>
                  {item.read ? (
                    <Badge>Read</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => markRead({ ids: [item.notificationId] })}>
                      Mark as read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </DataBoundary>
    </div>
  );
}

