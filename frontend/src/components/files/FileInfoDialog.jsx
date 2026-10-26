// components/files/FileInfoDialog.jsx
// WHAT THIS FILE IS: a dialog that opens when the user clicks a file row.
// WHAT IT DOES: shows the file name, size, date and action buttons — Share, Download,
// Preview (when supported), Rename, Move and Delete — so every action is reachable in
// one click from the file row itself.

import { formatBytes, formatDate } from "../../lib/format";
import { Download, Search, Share2, Pencil, FolderInput, Trash2 } from "../../lib/icons";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import FileIcon from "./FileIcon";
import { PREVIEWABLE_TYPES } from "../../config/settings";

export default function FileInfoDialog({ file, can, onClose, onDownload, onShare, onPreview, onRename, onMove, onDelete }) {
  if (!file) return null;

  const isPreviewable = PREVIEWABLE_TYPES.includes(file.contentType);

  return (
    <Modal
      open
      onClose={onClose}
      title={file.name}
      description={`${formatBytes(file.size)} · Uploaded ${formatDate(file.uploadedAt)}`}
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-leaf-50/60 px-4 py-3">
          <FileIcon contentType={file.contentType} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
            <p className="text-xs text-muted">{file.contentType || "Unknown type"}</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {can("share") && (
            <Button
              variant="soft"
              icon={Share2}
              className="justify-start"
              onClick={() => { onClose(); onShare(file); }}
            >
              Share
            </Button>
          )}
          {can("download") && (
            <Button
              variant="soft"
              icon={Download}
              className="justify-start"
              onClick={() => { onClose(); onDownload(file); }}
            >
              Download
            </Button>
          )}
          {isPreviewable && can("download") && (
            <Button
              variant="soft"
              icon={Search}
              className="justify-start"
              onClick={() => { onClose(); onPreview(file); }}
            >
              Preview
            </Button>
          )}
          {can("manageFiles") && (
            <Button
              variant="soft"
              icon={Pencil}
              className="justify-start"
              onClick={() => { onClose(); onRename(file); }}
            >
              Rename
            </Button>
          )}
          {can("manageFiles") && (
            <Button
              variant="soft"
              icon={FolderInput}
              className="justify-start"
              onClick={() => { onClose(); onMove(file); }}
            >
              Move
            </Button>
          )}
          {can("manageFiles") && (
            <Button
              variant="dangerSoft"
              icon={Trash2}
              className="justify-start col-span-2"
              onClick={() => { onClose(); onDelete(file); }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
