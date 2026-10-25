// components/files/UploadDialog.jsx
// WHAT THIS FILE IS: the Upload window.
// WHAT IT DOES: lets people pick several files (or drag them in) and uploads them one at a
// time, showing progress for each, with a Cancel button per file. For each file it:
//   1. asks the backend for permission and a short-lived upload link (the backend checks
//      login, permission, storage space, file size and type),
//   2. sends the file straight to S3 using that link,
//   3. tells the backend it finished so it can record the file.
// If a file with the same name is already in the folder, the backend keeps both and
// renames the new one (for example "report (1).pdf"). Failures are explained per file.

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, isNotConnected, uploadToSignedUrl } from "../../lib/api";
import { formatBytes } from "../../lib/format";
import { CircleAlert, CircleCheck, CloudUpload, X } from "../../lib/icons";
import Button from "../ui/Button";
import { Spinner } from "../ui/Feedback";
import Modal from "../ui/Modal";
import FileIcon from "./FileIcon";

// Turns a failure into a sentence that says what to do next.
function uploadErrorMessage(error) {
  if (isNotConnected(error)) return "Uploads are not connected to the server yet.";
  if (error instanceof ApiError) {
    if (error.code === "QUOTA_EXCEEDED") return "Not enough storage space left. Delete some files, or upload a smaller one.";
    if (error.code === "FILE_TOO_LARGE") return "This file is larger than the size allowed.";
    if (error.code === "TYPE_NOT_ALLOWED") return "This type of file is not allowed.";
    if (error.code === "PERMISSION_DENIED") return "You do not have permission to upload here.";
    return error.message;
  }
  return "The upload failed. Try again.";
}

export default function UploadDialog({ open, onClose, scope, folderId, onUploaded }) {
  const [items, setItems] = useState([]); // { id, file, status, progress, error, controller }
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const counter = useRef(0);
  const uploadedAny = useRef(false);

  // Empty the list each time the dialog opens.
  useEffect(() => {
    if (open) {
      setItems([]);
      setDragging(false);
      uploadedAny.current = false;
    }
  }, [open]);

  const patch = useCallback((id, changes) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const startUpload = useCallback(
    async (item) => {
      const controller = new AbortController();
      patch(item.id, { status: "uploading", progress: 0, controller });
      try {
        const slot = await api.files.uploadUrl({
          name: item.file.name,
          size: item.file.size,
          contentType: item.file.type || "application/octet-stream",
          folderId,
          scope,
        });
        await uploadToSignedUrl(slot.uploadUrl, item.file, {
          headers: slot.headers || {},
          signal: controller.signal,
          onProgress: (progress) => patch(item.id, { progress }),
        });
        await api.files.confirmUpload({ uploadId: slot.uploadId });
        uploadedAny.current = true;
        patch(item.id, { status: "done", progress: 100, controller: null });
        onUploaded();
      } catch (error) {
        if (error && error.name === "AbortError") patch(item.id, { status: "cancelled", controller: null });
        else patch(item.id, { status: "error", error: uploadErrorMessage(error), controller: null });
      }
    },
    [folderId, scope, onUploaded, patch]
  );

  // One upload at a time: when nothing is uploading, start the next queued file.
  useEffect(() => {
    if (items.some((item) => item.status === "uploading")) return;
    const next = items.find((item) => item.status === "queued");
    if (next) startUpload(next);
  }, [items, startUpload]);

  function addFiles(fileList) {
    const added = Array.from(fileList).map((file) => {
      counter.current += 1;
      return { id: counter.current, file, status: "queued", progress: 0, error: "", controller: null };
    });
    if (added.length > 0) setItems((current) => [...current, ...added]);
  }

  function cancel(item) {
    if (item.status === "uploading" && item.controller) item.controller.abort();
    else patch(item.id, { status: "cancelled" });
  }

  const busy = items.some((item) => item.status === "uploading" || item.status === "queued");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload files"
      description="Choose files from your phone or computer."
      footer={
        <Button onClick={onClose} variant={busy ? "secondary" : "primary"}>
          {busy ? "Close (uploads continue)" : "Done"}
        </Button>
      }
    >
      {/* The drop zone. Clicking it opens the normal file picker. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragging ? "border-leaf-500 bg-leaf-100" : "border-line bg-leaf-50/60"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-700">
          <CloudUpload className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink">Drag files here</p>
        <p className="text-sm text-muted">or</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => inputRef.current && inputRef.current.click()}>
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-label="Choose files to upload"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-3">
                <FileIcon contentType={item.file.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.file.name}</p>
                  <p className="text-xs text-muted">{formatBytes(item.file.size)}</p>
                </div>
                {item.status === "done" ? <CircleCheck className="h-5 w-5 text-leaf-600" aria-label="Uploaded" /> : null}
                {item.status === "error" ? <CircleAlert className="h-5 w-5 text-red-600" aria-label="Failed" /> : null}
                {item.status === "uploading" ? <Spinner className="h-4 w-4 text-leaf-600" /> : null}
                {item.status === "queued" || item.status === "uploading" ? (
                  <button
                    type="button"
                    onClick={() => cancel(item)}
                    className="rounded-lg p-1.5 text-muted transition hover:bg-leaf-100 hover:text-ink"
                    aria-label={`Cancel upload of ${item.file.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {item.status === "uploading" ? (
                <div className="mt-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress} aria-label={`Uploading ${item.file.name}`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-leaf-100">
                    <div className="h-full rounded-full bg-leaf-500 transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ) : null}
              {item.status === "queued" ? <p className="mt-1.5 text-xs text-muted">Waiting</p> : null}
              {item.status === "cancelled" ? <p className="mt-1.5 text-xs text-muted">Cancelled</p> : null}
              {item.status === "error" ? <p className="mt-1.5 text-sm text-red-700">{item.error}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}
