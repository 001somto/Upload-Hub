// hooks/useReducedMotion.js
// WHAT THIS FILE IS: a small helper that asks the device "does this person want less motion?".
// WHAT IT DOES: returns true when the visitor turned on "reduce motion" in their system
// settings. Animations that run from JavaScript (like the landing page slideshow) check
// this and stay still. CSS animations are switched off separately in index.css.

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export default function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia(QUERY);
    const onChange = (event) => setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
