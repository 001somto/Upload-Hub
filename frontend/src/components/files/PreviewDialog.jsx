// components/files/PreviewDialog.jsx
// WHAT THIS FILE IS: the window that opens an image or PDF without downloading it.
// WHAT IT DOES: asks the backend for a short-lived link to the file, then shows it as a
// picture or inside a PDF viewer. Other kinds of files are downloaded instead (the file
// list decides that before this dialog opens).

import useApiData from "../../hooks/useApiData";
import { api } from "../../lib/api";
import { Download } from "../../lib/icons";
import { formatBytes } from "../../lib/format";
import Button from "../ui/Button";
import DataBoundary from "../ui/DataBoundary";
import Modal from "../ui/Modal";

export default function PreviewDialog({ file, onClose, onDownload }) {
  const result = useApiData(() => (file ? api.files.previewUrl(file.fileId) : Promise.resolve(null)), [file && file.fileId]);
  if (!file) return null;
  const isPdf = file.contentType === "application/pdf";

  return (
    <Modal
      open
      onClose={onClose}
      title={file.name}
      description={formatBytes(file.size)}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button icon={Download} onClick={() => onDownload(file)}>
            Download
          </Button>
        </>
      }
    >
      <DataBoundary result={result} feature="Preview" rows={2}>
        {(data) =>
          data ? (
            isPdf ? (
              <iframe title={`Preview of ${file.name}`} src={data.url} className="h-[60vh] w-full rounded-xl border border-line" />
            ) : (
              <img src={data.url} alt={`Preview of ${file.name}`} className="mx-auto max-h-[60vh] rounded-xl object-contain" />
            )
          ) : null
        }
      </DataBoundary>
    </Modal>
  );
}
