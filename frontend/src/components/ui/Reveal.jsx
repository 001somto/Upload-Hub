// components/ui/Reveal.jsx
// WHAT THIS FILE IS: makes a block fade in when it scrolls into view.
// WHAT IT DOES: wraps content and plays one gentle fade-and-rise the first time it becomes
// visible. `delay` (in milliseconds) lets several blocks appear one after another.
//
// IT IS SAFE: if the browser cannot watch scrolling, or the visitor prefers reduced
// motion, the content is simply shown immediately. Content is never left hidden.

import { useEffect, useRef, useState } from "react";
import useReducedMotion from "../../hooks/useReducedMotion";

export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const canObserve = typeof window !== "undefined" && "IntersectionObserver" in window;
  const [visible, setVisible] = useState(!canObserve);

  useEffect(() => {
    if (!canObserve || visible) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);

    // Safety net: whatever happens, show the content after two seconds.
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [canObserve, visible]);

  const shown = visible || reduced;
  return (
    <Tag
      ref={ref}
      className={`${className} ${shown ? "" : "opacity-0"}`}
      style={shown && !reduced ? { animation: `rise 700ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms both` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
