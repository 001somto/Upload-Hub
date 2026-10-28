// components/files/FileBrowser.jsx
// WHAT THIS FILE IS: the file manager - the screen where people browse, upload, organise,
// preview, download, share, rename, move and delete files and folders.
// WHAT IT DOES: the same component is used in four places, chosen by `scope`:
//   scope "independent" -> a person's own workspace (Users: My files, Admins: My workspace)
//   scope "department"  -> the department's shared resources (Admins and Active members)
// Everything the screen shows comes from the backend (api.files.list). Buttons are hidden
// when the backend says the person lacks a permission, but the backend ALSO refuses
// the action itself, and any refusal is shown as a message.
//
// STATUS: PROVISIONAL endpoints (see lib/api.js). Until the backend offers them the screen
// shows "Not connected yet" - it never shows made-up files.

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { ApiError, api, isNotConnected } from "../../lib/api";
import { formatBytes, formatDate } from "../../lib/format";
import { ArrowRight, ChevronRight, CloudUpload, Download, FolderInput, FolderPlus, Pencil, Search, Share2, Trash2, X } from "../../lib/icons";
import { PREVIEWABLE_TYPES } from "../../config/settings";
import ActionMenu from "../ui/ActionMenu";
import Button from "../ui/Button";
import DataBoundary from "../ui/DataBoundary";
import { SelectField } from "../ui/Fields";
import { EmptyState } from "../ui/Feedback";
import { ConfirmDialog } from "../ui/Modal";
import FileIcon from "./FileIcon";
import MoveDialog from "./MoveDialog";
import NameDialog from "./NameDialog";
import PreviewDialog from "./PreviewDialog";
import ShareDialog from "./ShareDialog";
import FileInfoDialog from "./FileInfoDialog";
import UploadDialog from "./UploadDialog";

const SORTS = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "size", label: "Size" },
];

// Starts the browser's download for a short-lived link.
function triggerDownload(url, name) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Remembers (for the welcome panel) that this person has created a folder.
function rememberFolderCreated() {
  try {
    localStorage.setItem("uploadhub.onboarding.folder", "1");
  } catch {
    // Storage may be blocked; the welcome panel simply keeps showing.
  }
}

export default function FileBrowser({ scope = "independent" }) {
  const { toast } = useToast();
  const rootLabel = scope === "department" ? "Department files" : "My files";

  // ----- what the person is looking at -----
  const [folderId, setFolderId] = useState(null);
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [selected, setSelected] = useState(() => new Set()); // keys like "file:ID" or "folder:ID"
  const [dialog, setDialog] = useState(null); // which dialog is open, and for what
  const [busy, setBusy] = useState(false);

  // ----- loading the list from the backend -----
  const result = useApiData(() => api.files.list({ scope, folderId, q: search, sort, order }), [scope, folderId, search, sort, order]);
  const data = result.data;
  const folders = (data && data.folders) || [];
  const files = (data && data.files) || [];
  const breadcrumbs = (data && data.breadcrumbs) || [];
  const permissions = (data && data.permissions) || {};
  // Show a button unless the backend explicitly says "no".
  const can = (key) => permissions[key] !== false;

  // Clear the selection whenever the list changes place.
  useEffect(() => setSelected(new Set()), [scope, folderId, search]);

  // ----- selection -----
  const allKeys = useMemo(() => [...folders.map((f) => `folder:${f.folderId}`), ...files.map((f) => `file:${f.fileId}`)], [folders, files]);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));
  const selectedFileIds = [...selected].filter((key) => key.startsWith("file:")).map((key) => key.slice(5));
  const selectedFolderIds = [...selected].filter((key) => key.startsWith("folder:")).map((key) => key.slice(7));

  function toggle(key) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  }

  // ----- helpers -----
  function fail(error) {
    toast({
      title: "That did not work",
      message: isNotConnected(error) ? "This is not connected to the server yet." : error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
      tone: "error",
    });
  }

  async function afterChange(title) {
    setDialog(null);
    setSelected(new Set());
    result.reload();
    if (title) toast({ title });
  }

  async function downloadFile(file) {
    try {
      const { url } = await api.files.downloadUrl(file.fileId);
      triggerDownload(url, file.name);
    } catch (error) {
      fail(error);
    }
  }

  function openFile(file) {
    // For previewable types open the preview dialog; for all others open
    // the File Actions dialog so the user can Share, Download, Rename, etc.
    if (PREVIEWABLE_TYPES.includes(file.contentType) && can("download")) {
      setDialog({ type: "preview", file });
    } else {
      setDialog({ type: "info", file });
    }
  }

  async function downloadSelected() {
    const chosen = files.filter((file) => selectedFileIds.includes(file.fileId));
    for (const file of chosen) {
      // eslint-disable-next-line no-await-in-loop
      await downloadFile(file);
      // A short pause so the browser does not block the later downloads.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  function openFolder(id) {
    setQuery("");
    setFolderId(id);
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.files.remove({ fileIds: dialog.items.fileIds, folderIds: dialog.items.folderIds });
      await afterChange("Deleted");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  // The actions available on one row.
  function rowActions(item, kind) {
    const isFile = kind === "file";
    const items = isFile ? { fileIds: [item.fileId], folderIds: [] } : { fileIds: [], folderIds: [item.folderId] };
    return [
      { label: "Preview", icon: Search, hidden: !(isFile && PREVIEWABLE_TYPES.includes(item.contentType) && can("download")), onClick: () => openFile(item) },
      { label: "Download", icon: Download, hidden: !(isFile && can("download")), onClick: () => downloadFile(item) },
      { label: "Share", icon: Share2, hidden: !can("share"), onClick: () => setDialog({ type: "share", target: { type: kind, id: isFile ? item.fileId : item.folderId, name: item.name } }) },
      { label: "Rename", icon: Pencil, hidden: !can("manageFiles"), onClick: () => setDialog({ type: "rename", kind, item }) },
      { label: "Move", icon: FolderInput, hidden: !can("manageFiles"), onClick: () => setDialog({ type: "move", items }) },
      { label: "Delete", icon: Trash2, tone: "danger", hidden: !can("manageFiles"), onClick: () => setDialog({ type: "delete", items, name: item.name }) },
    ];
  }

  const deleteCount = dialog && dialog.type === "delete" ? dialog.items.fileIds.length + dialog.items.folderIds.length : 0;
  const hasFolderInDelete = dialog && dialog.type === "delete" && dialog.items.folderIds.length > 0;
  const selectedCount = selected.size;

  return (
    <div>
      {/* ----- toolbar: path, search, sort, main buttons ----- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => openFolder(null)} className="font-semibold text-leaf-800 hover:underline">
            {rootLabel}
          </button>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.folderId} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              {index === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-ink" aria-current="page">{crumb.name}</span>
              ) : (
                <button type="button" onClick={() => openFolder(crumb.folderId)} className="font-semibold text-leaf-800 hover:underline">
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {can("createFolders") ? (
            <Button variant="secondary" icon={FolderPlus} onClick={() => setDialog({ type: "newFolder" })}>
              New folder
            </Button>
          ) : null}
          {can("upload") ? (
            <Button icon={CloudUpload} onClick={() => setDialog({ type: "upload" })}>
              Upload
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by file or folder name"
            aria-label="Search files and folders"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm placeholder:text-muted/70 hover:border-leaf-300 focus:border-leaf-600 focus:outline-none focus:ring-4 focus:ring-leaf-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-36">
            <SelectField aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  Sort: {option.label}
                </option>
              ))}
            </SelectField>
          </div>
          <Button
            variant="secondary"
            onClick={() => setOrder((current) => (current === "asc" ? "desc" : "asc"))}
            aria-label={order === "asc" ? "Sorted ascending. Switch to descending" : "Sorted descending. Switch to ascending"}
          >
            {order === "asc" ? "A-Z" : "Z-A"}
          </Button>
        </div>
      </div>

      {/* ----- bar that appears when items are ticked ----- */}
      {selectedCount > 0 ? (
        <div role="region" aria-label="Selected items" className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-leaf-900 px-4 py-3 text-white">
          <span className="mr-auto text-sm font-semibold">{selectedCount} selected</span>
          {selectedFolderIds.length === 0 && can("download") ? (
            <Button size="sm" variant="onDark" icon={Download} onClick={downloadSelected}>
              Download
            </Button>
          ) : null}
          {can("manageFiles") ? (
            <>
              <Button size="sm" variant="onDark" icon={FolderInput} onClick={() => setDialog({ type: "move", items: { fileIds: selectedFileIds, folderIds: selectedFolderIds } })}>
                Move
              </Button>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDialog({ type: "delete", items: { fileIds: selectedFileIds, folderIds: selectedFolderIds } })}>
                Delete
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="outlineOnDark" icon={X} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      {/* ----- the list ----- */}
      <div className="mt-4">
        <DataBoundary
          result={result}
          feature="Your files"
          showStale
          rows={4}
          isEmpty={(value) => !value || ((value.folders || []).length === 0 && (value.files || []).length === 0)}
          empty={
            search ? (
              <EmptyState title="Nothing matches that search" body="Try a different word, or clear the search box." />
            ) : (
              <EmptyState
                title="This folder is empty"
                body={can("upload") ? "Upload a file or create a folder to get started." : "There is nothing here yet."}
                action={
                  can("upload") ? (
                    <Button icon={CloudUpload} onClick={() => setDialog({ type: "upload" })}>
                      Upload files
                    </Button>
                  ) : null
                }
              />
            )
          }
        >
          {() => (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
              <div className="flex items-center gap-3 border-b border-line bg-leaf-50/70 px-3 py-2.5 text-xs font-semibold text-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 cursor-pointer rounded accent-leaf-600"
                />
                <span className="flex-1">Name</span>
                <span className="hidden w-24 text-right sm:block">Size</span>
                <span className="hidden w-28 text-right md:block">Date</span>
                <span className="w-9 sm:w-[5.5rem]" />
              </div>
              <ul aria-label="Files and folders" className="divide-y divide-line">
                {folders.map((folder) => (
                  <li key={`folder:${folder.folderId}`} className={`flex items-center gap-3 px-3 py-2.5 transition ${selected.has(`folder:${folder.folderId}`) ? "bg-leaf-50" : "hover:bg-leaf-50/50"}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(`folder:${folder.folderId}`)}
                      onChange={() => toggle(`folder:${folder.folderId}`)}
                      aria-label={`Select folder ${folder.name}`}
                      className="h-4 w-4 cursor-pointer rounded accent-leaf-600"
                    />
                    <button type="button" onClick={() => openFolder(folder.folderId)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <FileIcon folder />
                      <span className="truncate text-sm font-semibold text-ink">{folder.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    </button>
                    <span className="hidden w-24 text-right text-sm text-muted sm:block">
                      {folder.itemCount != null ? `${folder.itemCount} ${folder.itemCount === 1 ? "item" : "items"}` : ""}
                    </span>
                    <span className="hidden w-28 text-right text-sm text-muted md:block">{formatDate(folder.createdAt)}</span>
                    <ActionMenu label={`Actions for folder ${folder.name}`} items={rowActions(folder, "folder")} />
                  </li>
                ))}
                {files.map((file) => (
                  <li key={`file:${file.fileId}`} className={`flex items-center gap-3 px-3 py-2.5 transition ${selected.has(`file:${file.fileId}`) ? "bg-leaf-50" : "hover:bg-leaf-50/50"}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(`file:${file.fileId}`)}
                      onChange={() => toggle(`file:${file.fileId}`)}
                      aria-label={`Select ${file.name}`}
                      className="h-4 w-4 cursor-pointer rounded accent-leaf-600"
                    />
                    <button
                      type="button"
                      onClick={() => openFile(file)}
                      title={PREVIEWABLE_TYPES.includes(file.contentType) ? "Click to preview" : "Use the Share or ⋯ menu to act on this file"}
                      className={`flex min-w-0 flex-1 items-center gap-3 text-left ${PREVIEWABLE_TYPES.includes(file.contentType) ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <FileIcon contentType={file.contentType} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{file.name}</span>
                        <span className="block truncate text-xs text-muted sm:hidden">{formatBytes(file.size)}</span>
                      </span>
                    </button>
                    <span className="hidden w-24 text-right text-sm text-muted sm:block">{formatBytes(file.size)}</span>
                    <span className="hidden w-28 text-right text-sm text-muted md:block">{formatDate(file.uploadedAt)}</span>
                    {can("share") ? (
                      <button
                        type="button"
                        title="Share"
                        aria-label={`Share ${file.name}`}
                        onClick={() => setDialog({ type: "share", target: { type: "file", id: file.fileId, name: file.name } })}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-leaf-100 hover:text-leaf-700 transition"
                      >
                        <Share2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                    <ActionMenu label={`Actions for ${file.name}`} items={rowActions(file, "file")} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DataBoundary>
      </div>

      {/* ----- dialogs ----- */}
      <UploadDialog open={dialog && dialog.type === "upload"} onClose={() => { setDialog(null); result.reload(); }} scope={scope} folderId={folderId} onUploaded={result.reload} />

      <NameDialog
        open={Boolean(dialog && dialog.type === "newFolder")}
        onClose={() => setDialog(null)}
        title="New folder"
        label="Folder name"
        confirmLabel="Create folder"
        onSubmit={async (name) => {
          await api.files.createFolder({ name, parentFolderId: folderId, scope });
          rememberFolderCreated();
          await afterChange("Folder created");
        }}
      />

      <NameDialog
        open={Boolean(dialog && dialog.type === "rename")}
        onClose={() => setDialog(null)}
        title={dialog && dialog.kind === "folder" ? "Rename folder" : "Rename file"}
        label="New name"
        initial={dialog && dialog.item ? dialog.item.name : ""}
        onSubmit={async (name) => {
          if (dialog.kind === "folder") await api.files.renameFolder(dialog.item.folderId, { name });
          else await api.files.renameFile(dialog.item.fileId, { name });
          await afterChange("Renamed");
        }}
      />

      <MoveDialog
        open={Boolean(dialog && dialog.type === "move")}
        onClose={() => setDialog(null)}
        scope={scope}
        items={dialog && dialog.items ? dialog.items : { fileIds: [], folderIds: [] }}
        currentFolderId={folderId}
        onMoved={() => afterChange("Moved")}
      />

      <ConfirmDialog
        open={Boolean(dialog && dialog.type === "delete")}
        onClose={() => setDialog(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={deleteCount === 1 && dialog && dialog.name ? `Delete "${dialog.name}"?` : `Delete ${deleteCount} items?`}
        message={`This permanently deletes ${deleteCount === 1 ? "it" : "them"}. This cannot be undone.${hasFolderInDelete ? " Folders are deleted with everything inside them." : ""}`}
        confirmLabel="Delete permanently"
      />

      <ShareDialog open={Boolean(dialog && dialog.type === "share")} onClose={() => setDialog(null)} target={dialog && dialog.target} />

      {dialog && dialog.type === "preview" ? (
        <PreviewDialog
          file={dialog.file}
          can={can}
          onClose={() => setDialog(null)}
          onDownload={downloadFile}
          onShare={(file) => setDialog({ type: "share", target: { type: "file", id: file.fileId, name: file.name } })}
        />
      ) : null}

      {dialog && dialog.type === "info" ? (
        <FileInfoDialog
          file={dialog.file}
          can={can}
          onClose={() => setDialog(null)}
          onDownload={(file) => downloadFile(file)}
          onShare={(file) => setDialog({ type: "share", target: { type: "file", id: file.fileId, name: file.name } })}
          onPreview={(file) => setDialog({ type: "preview", file })}
          onRename={(file) => setDialog({ type: "rename", kind: "file", item: file })}
          onMove={(file) => setDialog({ type: "move", items: { fileIds: [file.fileId], folderIds: [] } })}
          onDelete={(file) => setDialog({ type: "delete", items: { fileIds: [file.fileId], folderIds: [] }, name: file.name })}
        />
      ) : null}
    </div>
  );
}
