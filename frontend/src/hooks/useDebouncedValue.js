// hooks/useDebouncedValue.js
// WHAT THIS FILE IS: a helper that waits for someone to stop typing.
// WHAT IT DOES: returns the value only after it has stayed the same for `delay`
// milliseconds. Used by search boxes so the backend is not asked after every key press.

import { useEffect, useState } from "react";

export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
