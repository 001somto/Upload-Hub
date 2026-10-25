// components/files/NameDialog.jsx
// WHAT THIS FILE IS: a small dialog that asks for a name - used for "New folder" and "Rename".
// WHAT IT DOES: shows one text box. On Save it calls `onSubmit(name)`. If that fails (for
// example the name is already taken) the message is shown inside the dialog.

import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import Button from "../ui/Button";
import { TextField } from "../ui/Fields";
import Modal from "../ui/Modal";

export default function NameDialog({ open, onClose, title, label, initial = "", confirmLabel = "Save", onSubmit }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(initial);
      setError("");
      setBusy(false);
    }
  }, [open, initial]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name.");
      return;
    }
    if (/[\\/]/.test(trimmed)) {
      setError("Names cannot contain / or \\.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(trimmed);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="name-dialog-form" loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id="name-dialog-form" onSubmit={handleSubmit} noValidate>
        <TextField label={label} value={name} onChange={(event) => setName(event.target.value)} error={error} maxLength={200} autoFocus />
      </form>
    </Modal>
  );
}

