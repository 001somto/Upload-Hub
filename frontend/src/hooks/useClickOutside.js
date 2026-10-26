// hooks/useClickOutside.js
// WHAT THIS FILE IS: a helper for menus that should close by themselves.
// WHAT IT DOES: calls `handler` when someone clicks outside the element in `ref`, or
// presses Escape, while `active` is true. Used by the profile menu and row action menus.

import { useEffect } from "react";

export default function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    function onPointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) handler(event);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") handler(event);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, handler, active]);
}
