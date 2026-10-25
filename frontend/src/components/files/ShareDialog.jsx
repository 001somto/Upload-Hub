// components/files/ShareDialog.jsx
// WHAT THIS FILE IS: the "Share" dialog for a file or folder.
// WHAT IT DOES: lets the person choose how long the link lasts (1, 7 or 30 days, or a date
// they pick), asks the backend to create it, and then shows the link with a Copy button.
// The backend sets the longest allowed time and decides who may share; refusals are shown.
// File links work for anyone with the link. Folder links make people sign in first.

import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { ApiError, api, isNotConnected } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { Copy } from "../../lib/icons";
import Button from "../ui/Button";
import { SelectField, TextField } from "../ui/Fields";
import { InlineAlert } from "../ui/Feedback";
import Modal from "../ui/Modal";

export default function ShareDialog({ open, onClose, target }) {
  const { toast } = useToast();
  const [choice, setChoice] = useState("7");
  const [customDate, setCustomDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (open) {
      setChoice("7");
      setCustomDate("");
      setError("");
      setBusy(false);
      setLink(null);
    }
  }, [open]);

  if (!target) return null;
  const isFolder = target.type === "folder";
  const today = new Date().toISOString().slice(0, 10);

  async function create() {
    setError("");
    const body = { targetType: target.type, targetId: target.id };
    if (choice === "custom") {
      if (!customDate || customDate < today) {
        setError("Choose a date that is today or later.");
        return;
      }
      // End of the chosen day, Nigeria time (UTC+1).
      body.expiresAt = new Date(`${customDate}T23:59:59+01:00`).toISOString();
    } else {
      body.expiresInDays = Number(choice);
    }

    setBusy(true);
    try {
      const data = await api.shares.create(body);
      setLink(data.link || data);
    } catch (caught) {
      setError(isNotConnected(caught) ? "Share links are not connected to the server yet." : caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const url = link ? link.url || `${window.location.origin}/share/${link.linkId}` : "";

  async function copy() {
    const ok = await copyText(url);
    toast(ok ? { title: "Link copied" } : { title: "Could not copy", message: "Select the link and copy it by hand.", tone: "error" });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={link ? "Your link is ready" : `Share "${target.name}"`}
      size="sm"
      footer={
        link ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={create} loading={busy}>
              Create link
            </Button>
          </>
        )
      }
    >
      {link ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input readOnly value={url} aria-label="Share link" onFocus={(event) => event.target.select()} className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-leaf-50 px-3.5 text-sm text-ink" />
            <Button variant="soft" icon={Copy} onClick={copy}>
              Copy
            </Button>
          </div>
          <p className="text-sm text-muted">
            Anyone who {isFolder ? "signs in and " : ""}has this link can open it until it expires. You can turn it off any time from Share links.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {isFolder ? <InlineAlert tone="info">People must sign in to open a folder link.</InlineAlert> : null}
          <SelectField label="Link expires after" value={choice} onChange={(event) => setChoice(event.target.value)}>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="custom">A date I choose</option>
          </SelectField>
          {choice === "custom" ? (
            <TextField label="Last day the link works" type="date" min={today} value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
          ) : null}
          <p className="text-sm text-muted">The server may limit how long a link can last.</p>
        </div>
      )}
    </Modal>
  );
}
