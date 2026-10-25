// components/ui/Modal.jsx
// WHAT THIS FILE IS: the pop-up dialog that appears over the page.
// WHAT IT DOES: `Modal` shows a titled box with your content. Pressing Escape or clicking
// outside closes it, keyboard focus stays inside it while open, and focus returns to the
// button that opened it when it closes. `ConfirmDialog` is a ready-made "Are you sure?"
// version used before deleting or removing things.
//
// Example:
//   <Modal open={open} onClose={() => setOpen(false)} title="New folder" footer={<Button>Create</Button>}>
//     ...form fields...
//   </Modal>

import { useEffect, useId, useRef } from "react";
import { X } from "../../lib/icons";
import Button from "./Button";

const WIDTHS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  // Keeps the newest onClose without restarting the effect below every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;

    // Put keyboard focus inside the dialog.
    const items = panel ? panel.querySelectorAll(FOCUSABLE) : [];
    if (items.length > 0) items[0].focus();
    else if (panel) panel.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      // Keep Tab and Shift+Tab inside the dialog.
      if (event.key === "Tab" && panel) {
        const list = Array.from(panel.querySelectorAll(FOCUSABLE));
        if (list.length === 0) {
          event.preventDefault();
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind from scrolling while the dialog is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* The dimmed background. Clicking it closes the dialog. */}
      <div className="absolute inset-0 animate-fade bg-leaf-950/50" onClick={() => closeRef.current()} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-3xl bg-white shadow-window sm:rounded-3xl ${WIDTHS[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => closeRef.current()}
            className="rounded-lg p-1.5 text-muted transition hover:bg-leaf-100 hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

// "Are you sure?" dialog. `tone="danger"` makes the confirm button red.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}
