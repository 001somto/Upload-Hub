// hooks/useApiData.js
// WHAT THIS FILE IS: a helper that loads data for a screen.
// WHAT IT DOES: calls a function from lib/api.js and keeps track of what happened, so
// the screen can show the right thing:
//   status "loading"       -> show a skeleton
//   status "ready"         -> show `data`
//   status "error"         -> show the error with a Try again button
//   status "notConnected"  -> the backend does not offer this yet; show "Not connected yet"
// Call `reload()` to fetch again (for example after saving a change).
//
// Example:
//   const result = useApiData(() => api.storage.me(), []);
//   <DataBoundary result={result}>{(data) => <p>{data.usedBytes}</p>}</DataBoundary>

import { useCallback, useEffect, useRef, useState } from "react";
import { isNotConnected } from "../lib/api";

export default function useApiData(fetcher, deps = []) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [tick, setTick] = useState(0);

  // Keeps the newest fetcher without making the effect run again on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, status: "loading", error: null }));

    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: isNotConnected(error) ? "notConnected" : "error", data: null, error });
      });

    // If the screen closes before the answer arrives, ignore the answer.
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  // Lets a screen replace the data directly (for example after an edit) without fetching again.
  const setData = useCallback((data) => setState((previous) => ({ ...previous, data })), []);

  return { ...state, reload, setData };
}
