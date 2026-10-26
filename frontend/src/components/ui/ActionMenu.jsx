// components/ui/ActionMenu.jsx
// Actions drop-down shown at the end of table and file rows.
// Uses React Portal and viewport-aware fixed coordinates to avoid being clipped by overflow containers.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "../../lib/icons";

export default function ActionMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (
        (menuRef.current && menuRef.current.contains(event.target)) ||
        (buttonRef.current && buttonRef.current.contains(event.target))
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  if (visible.length === 0) return null;

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 208; // 13rem / w-52
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 220 && rect.top > 220;

      let left = rect.right - menuWidth;
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setMenuPosition({
        top: openUp ? `${rect.top - 6}px` : `${rect.bottom + 6}px`,
        left: `${left}px`,
        transform: openUp ? "translateY(-100%)" : "none",
      });
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-white px-2.5 text-sm font-medium text-ink transition hover:border-leaf-300 hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-leaf-500"
      >
        <span className="hidden sm:inline">Actions</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                transform: menuPosition.transform,
                zIndex: 9999,
              }}
              className="w-52 animate-pop rounded-2xl border border-line bg-white p-1.5 shadow-lift"
            >
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
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
