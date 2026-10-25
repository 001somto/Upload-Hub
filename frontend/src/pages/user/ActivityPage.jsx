// pages/user/ActivityPage.jsx
// WHAT THIS FILE IS: "My activity" - the signed-in person's own history.
// WHAT IT DOES: lists what THIS person did (uploads, downloads, shares, membership steps...),
// newest first, 20 at a time. It only ever shows the person's own events, and nobody can
// edit or delete them - the list is recorded on the server.
// STATUS: PROVISIONAL endpoint (api.audit.mine).

import { useState } from "react";
import Card from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { EmptyState } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import { describeAction } from "../../lib/audit";
import { formatDateTime } from "../../lib/format";
import { Activity } from "../../lib/icons";

const PAGE_SIZE = 20;

export default function ActivityPage() {
  useDocumentTitle("My activity");
  const [page, setPage] = useState(1);
  const result = useApiData(() => api.audit.mine({ page, pageSize: PAGE_SIZE }), [page]);

  return (
    <div>
      <PageHeader title="My activity" description="A record of what you have done in UploadHub. Only you can see this list." />
      <DataBoundary
        result={result}
        feature="Your activity"
        showStale
        isEmpty={(data) => !data || (data.items || []).length === 0}
        empty={<EmptyState icon={Activity} title="No activity yet" body="Uploads, downloads, shares and membership changes will appear here." />}
      >
        {(data) => (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {data.items.map((item) => (
                <li key={item.logId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
                  <p className="min-w-0 text-sm text-ink">
                    <span className="font-semibold">{describeAction(item.action)}</span>
                    {item.target ? <span className="text-muted">: {item.target}</span> : null}
                  </p>
                  <time dateTime={item.timestamp} className="shrink-0 text-sm text-muted">
                    {formatDateTime(item.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 pb-4">
              <Pagination page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total || 0} onPageChange={setPage} />
            </div>
          </Card>
        )}
      </DataBoundary>
    </div>
  );
}
