// components/ui/Logo.jsx
// WHAT THIS FILE IS: the UploadHub logo - a green cloud with an upload arrow, plus the name.
// WHAT IT DOES: `Logo` draws the icon and the name side by side. `LogoMark` draws the
// icon alone. It is an original design drawn in SVG, so it stays sharp at any size.
// Use tone="light" on dark green backgrounds so the name turns white.

import { useId } from "react";
import { settings } from "../../config/settings";

export function LogoMark({ className = "h-9 w-9" }) {
  // useId gives each logo on the page its own gradient name so they never clash.
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6fb97b" />
          <stop offset="1" stopColor="#246b3b" />
        </linearGradient>
      </defs>
      <path
        d="M14 36a9 9 0 0 1-1.2-17.9A11 11 0 0 1 34.4 17 9.5 9.5 0 0 1 35 36H14Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M24 31V21m0 0-4.5 4.5M24 21l4.5 4.5"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ tone = "dark", className = "", markClassName = "h-9 w-9", textClassName = "text-xl" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span
        className={`font-display font-extrabold tracking-tight ${textClassName} ${tone === "light" ? "text-white" : "text-leaf-900"}`}
      >
        {settings.appName}
      </span>
    </span>
  );
}
