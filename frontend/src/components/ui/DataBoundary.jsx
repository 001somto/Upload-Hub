// components/ui/DataBoundary.jsx
// WHAT THIS FILE IS: a wrapper that shows the right thing for loaded data.
// WHAT IT DOES: you give it the result of useApiData() and a function that draws the data.
// It shows a loading placeholder, an error with "Try again", a "Not connected yet" note,
// or an empty state - and only calls your function when there is real data to show.
//
// Example:
//   const result = useApiData(() => api.storage.me(), []);
//   <DataBoundary result={result} feature="Storage overview">
//     {(data) => <p>{formatBytes(data.usedBytes)} used</p>}
//   </DataBoundary>
//
// Props:
//   feature   -> name used in the "Not connected yet" message
//   isEmpty   -> optional function (data) => true when there is nothing to list
//   empty     -> what to show when isEmpty is true (usually an <EmptyState />)
//   loading   -> optional custom loading placeholder
//   showStale -> keep showing the old data while reloading instead of the placeholder

import { ErrorState, LoadingBlock, NotConnected } from "./Feedback";

export default function DataBoundary({ result, feature, isEmpty, empty = null, loading, rows = 3, showStale = false, children }) {
  const { status, data, error, reload } = result;

  if (status === "notConnected") return <NotConnected feature={feature} />;
  if (status === "error") return <ErrorState error={error} onRetry={reload} />;
  if (status === "loading" && !(showStale && data)) return loading || <LoadingBlock rows={rows} label={`Loading ${feature || ""}`.trim()} />;

  if (isEmpty && isEmpty(data)) return empty;
  return children(data);
}
