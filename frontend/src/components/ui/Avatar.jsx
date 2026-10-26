// components/ui/Avatar.jsx
// WHAT THIS FILE IS: the round picture that represents a person.
// WHAT IT DOES: shows their profile photo if they have one; otherwise their initials on
// a green background (for example "CO" for Chidinma Okafor).

import { useEffect, useState } from "react";
import { initials } from "../../lib/format";

export default function Avatar({ name, src, className = "h-9 w-9 text-sm" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-leaf-200 font-bold text-leaf-900 ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
