// components/files/MoveDialog.jsx
// WHAT THIS FILE IS: the "Move to..." dialog.
// WHAT IT DOES: lets the person browse folders, one level at a time, and pick where the
// chosen files and folders should go. Folders being moved are not offered as targets, so
// nothing can be moved into itself. The server does the real move and its own checks.

import { useEffect, useState } from "react";
import useApiData from "../../hooks/useApiData";
import { ApiError, api } from "../../lib/api";
import { ChevronRight } from "../../lib/icons";
import Button from "../ui/Button";
import DataBoundary from "../ui/DataBoundary";
import { InlineAlert } from "../ui/Feedback";
import Modal from "../ui/Modal";
import FileIcon from "./FileIcon";

export default function MoveDialog({ open, onClose, scope, items, currentFolderId, onMoved }) {
  const [browsing, setBrowsing] = useState(null); // the folder being looked at (null = top level)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setBrowsing(null);
      setBusy(false);
      setError("");
    }
  }, [open]);

  const result = useApiData(() => (open ? api.files.list({ scope, folderId: browsing }) : Promise.resolve(null)), [open, scope, browsing]);

  async function move() {
    setBusy(true);
    setError("");
    try {
      await api.files.move({ fileIds: items.fileIds, folderIds: items.folderIds, targetFolderId: browsing });
      await onMoved();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const count = items.fileIds.length + items.folderIds.length;
  const sameFolder = browsing === currentFolderId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Move ${count} ${count === 1 ? "item" : "items"}`}
      description="Open folders to choose where to move them."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={move} loading={busy} disabled={sameFolder}>
            Move here
          </Button>
        </>
      }
    >
      {error ? <InlineAlert tone="error" className="mb-4">{error}</InlineAlert> : null}
      <DataBoundary result={result} feature="Folders" rows={3} showStale>
        {(data) =>
          data ? (
            <div>
              {/* Where you are now, and how to go back up. */}
              <nav aria-label="Folder path" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
                <button type="button" className="font-semibold text-leaf-800 hover:underline" onClick={() => setBrowsing(null)}>
                  Top level
                </button>
                {(data.breadcrumbs || []).map((crumb) => (
                  <span key={crumb.folderId} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                    <button type="button" className="font-semibold text-leaf-800 hover:underline" onClick={() => setBrowsing(crumb.folderId)}>
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </nav>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {(data.folders || [])
                  .filter((folder) => !items.folderIds.includes(folder.folderId))
                  .map((folder) => (
                    <li key={folder.folderId}>
                      <button
                        type="button"
                        onClick={() => setBrowsing(folder.folderId)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-medium text-ink transition hover:bg-leaf-50"
                      >
                        <FileIcon folder />
                        <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                {(data.folders || []).filter((folder) => !items.folderIds.includes(folder.folderId)).length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted">No folders in here. You can move the items here, or go back up.</li>
                ) : null}
              </ul>
              {sameFolder ? <p className="mt-3 text-sm text-muted">The items are already in this folder.</p> : null}
            </div>
          ) : null
        }
      </DataBoundary>
    </Modal>
  );
}
