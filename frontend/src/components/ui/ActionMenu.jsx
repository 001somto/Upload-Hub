// components/ui/ActionMenu.jsx
// WHAT THIS FILE IS: the small "Actions" drop-down shown at the end of table and file rows.
// WHAT IT DOES: a button that opens a list of actions. `items` is a list of
// { label, icon, onClick, tone } objects (tone "danger" makes an action red). Hidden items
// (`hidden: true`) are left out. Escape or a click outside closes it. `label` names the row
// for screen readers, e.g. "Actions for report.pdf".

import { useRef, useState } from "react";
import useClickOutside from "../../hooks/useClickOutside";
import { ChevronDown } from "../../lib/icons";

export default function ActionMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-white px-2.5 text-sm font-medium text-ink transition hover:border-leaf-300 hover:bg-leaf-50"
      >
        <span className="hidden sm:inline">Actions</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-52 animate-pop rounded-2xl border border-line bg-white p-1.5 shadow-lift">
          {visible.map(({ label: itemLabel, icon: Icon, onClick, tone }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                tone === "danger" ? "text-red-700 hover:bg-red-50" : "text-ink hover:bg-leaf-100"
              }`}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              {itemLabel}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
