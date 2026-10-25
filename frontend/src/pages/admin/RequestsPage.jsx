// pages/admin/RequestsPage.jsx
// WHAT THIS FILE IS: the "Join requests" screen for Admins.
// WHAT IT DOES: lists people who asked to join the Admin's department, with Approve and
// Reject buttons. The backend decides who may do this (only this department's Admin) and
// changes the person's membership state.
// STATUS: PROVISIONAL endpoints (api.department.requests / decideRequest).

import { useState } from "react";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { EmptyState } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api, isNotConnected } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { UserPlus } from "../../lib/icons";

export default function RequestsPage() {
  useDocumentTitle("Join requests");
  const { toast } = useToast();
  const result = useApiData(() => api.department.requests(), []);
  const [working, setWorking] = useState(""); // "<requestId>:<decision>" while a request is being sent

  async function decide(request, decision) {
    setWorking(`${request.requestId}:${decision}`);
    try {
      await api.department.decideRequest(request.requestId, decision);
      toast({ title: decision === "approve" ? `${request.name} was approved` : `${request.name} was rejected` });
      result.reload();
    } catch (error) {
      toast({
        title: "That did not work",
        message: isNotConnected(error) ? "This is not connected to the server yet." : error instanceof ApiError ? error.message : "Something went wrong.",
        tone: "error",
      });
    } finally {
      setWorking("");
    }
  }

  return (
    <div>
      <PageHeader title="Join requests" description="People asking to join your department. Approving gives them access to department files." />
      <DataBoundary
        result={result}
        feature="Join requests"
        isEmpty={(data) => !data || (data.items || []).length === 0}
        empty={<EmptyState icon={UserPlus} title="No requests waiting" body="When someone asks to join your department, you can approve or reject them here." />}
      >
        {(data) => (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {data.items.map((request) => (
                <li key={request.requestId} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <Avatar name={request.name} className="h-10 w-10" />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-semibold text-ink">{request.name}</p>
                    <p className="truncate text-sm text-muted">{request.email}</p>
                    <p className="text-xs text-muted">Asked on {formatDateTime(request.requestedAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={working === `${request.requestId}:approve`} disabled={Boolean(working)} onClick={() => decide(request, "approve")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" loading={working === `${request.requestId}:reject`} disabled={Boolean(working)} onClick={() => decide(request, "reject")}>
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </DataBoundary>
    </div>
  );
}
