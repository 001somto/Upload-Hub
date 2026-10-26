// pages/shared/SharesPage.jsx
// WHAT THIS FILE IS: the "Share links" screen, used by both Users and Admins.
// WHAT IT DOES: lists the links the person has made, with a clear status for each
// (Active, Expired or Revoked), a Copy button and a Revoke button for active links.
// New links are made from the file manager (choose "Share" on a file or folder).
// STATUS: PROVISIONAL endpoints (api.shares.list / revoke).

import { useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { EmptyState } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { formatDateTime, timeUntil } from "../../lib/format";
import { Check, CircleX, Clock, Copy, Link2 } from "../../lib/icons";

const STATUS = {
  active: { label: "Active", tone: "green", icon: Check },
  expired: { label: "Expired", tone: "amber", icon: Clock },
  revoked: { label: "Revoked", tone: "red", icon: CircleX },
};

export default function SharesPage() {
  useDocumentTitle("Share links");
  const { user } = useAuth();
  const { toast } = useToast();
  const result = useApiData(() => api.shares.list(), []);
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(false);
  const filesPath = user?.role === "admin" ? "/admin/workspace" : "/app/files";

  async function copy(link) {
    const url = link.url || `${window.location.origin}/share/${link.linkId}`;
    const ok = await copyText(url);
    toast(ok ? { title: "Link copied" } : { title: "Could not copy", message: "Select the link and copy it by hand.", tone: "error" });
  }

  async function revoke() {
    setBusy(true);
    try {
      await api.shares.revoke(revoking.linkId);
      toast({ title: "Link revoked", message: "It no longer works." });
      setRevoking(null);
      result.reload();
    } catch (error) {
      toast({ title: "That did not work", message: error instanceof ApiError ? error.message : "Something went wrong.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Share links"
        description="Links you have created. Expiry and revocation are checked every time someone opens a link."
        actions={
          <Button to={filesPath} variant="secondary">
            Go to my files
          </Button>
        }
      />
      <DataBoundary
        result={result}
        feature="Your share links"
        isEmpty={(data) => !data || (data.items || []).length === 0}
        empty={
          <EmptyState
            icon={Link2}
            title="You have not shared anything yet"
            body="Open your files, choose Share on a file or folder, and pick how long the link should work."
            action={<Button to={filesPath}>Go to my files</Button>}
          />
        }
      >
        {(data) => (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {data.items.map((link) => {
                const status = STATUS[link.status] || STATUS.active;
                return (
                  <li key={link.linkId} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate font-semibold text-ink">{link.targetName}</p>
                      <p className="text-sm text-muted">
                        {link.targetType === "folder" ? "Folder" : "File"}, created {formatDateTime(link.createdAt)}
                      </p>
                    </div>
                    <div className="text-sm text-muted">
                      {link.status === "active" ? `Expires ${timeUntil(link.expiresAt)}` : `Ended ${formatDateTime(link.expiresAt)}`}
                    </div>
                    <Badge tone={status.tone} icon={status.icon}>
                      {status.label}
                    </Badge>
                    {link.status === "active" ? (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" icon={Copy} onClick={() => copy(link)}>
                          Copy
                        </Button>
                        <Button variant="dangerSoft" size="sm" onClick={() => setRevoking(link)}>
                          Revoke
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </DataBoundary>

      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        loading={busy}
        title="Revoke this link?"
        message={`Anyone using the link to "${revoking ? revoking.targetName : ""}" will lose access straight away. You can make a new link later.`}
        confirmLabel="Revoke link"
      />
    </div>
  );
}

// Re-exported so other screens can show the same status names if they need to.
