// components/ui/Feedback.jsx
// WHAT THIS FILE IS: everything a screen shows while it has no data to show.
// WHAT IT DOES:
//   Spinner / Skeleton / LoadingBlock -> "still loading" placeholders
//   EmptyState    -> nothing here yet, with a suggestion for what to do
//   ErrorState    -> something failed, with the reason and a Try again button
//   NotConnected  -> the backend does not offer this feature yet
//   InlineAlert   -> a coloured note inside a form or page (info, success, warning, error)

import { Cloud, CircleAlert, CircleCheck, Info, RefreshCw, TriangleAlert, Zap } from "../../lib/icons";
import Button from "./Button";

export function Spinner({ className = "h-5 w-5" }) {
  return <RefreshCw className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-leaf-100 ${className}`} aria-hidden="true" />;
}

// A few grey bars that stand in for content while it loads.
export function LoadingBlock({ rows = 3, label = "Loading" }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

function CenteredMessage({ icon: Icon, iconClasses, title, body, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${iconClasses}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {body ? <p className="mt-1.5 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// Nothing here yet. Use `action` for a button that fixes it ("Upload a file").
export function EmptyState({ icon = Cloud, title, body, action }) {
  return <CenteredMessage icon={icon} iconClasses="bg-leaf-100 text-leaf-700" title={title} body={body} action={action} />;
}

// Something failed. `error` is an ApiError (its message is shown); `onRetry` adds a button.
export function ErrorState({ error, title = "This could not be loaded", onRetry }) {
  return (
    <div role="alert">
      <CenteredMessage
        icon={CircleAlert}
        iconClasses="bg-red-50 text-red-600"
        title={title}
        body={error && error.message ? error.message : "Something went wrong. Please try again."}
        action={
          onRetry ? (
            <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
              Try again
            </Button>
          ) : null
        }
      />
    </div>
  );
}

// The backend does not have this endpoint yet. No invented numbers are shown instead.
export function NotConnected({ feature = "This section" }) {
  return (
    <CenteredMessage
      icon={Zap}
      iconClasses="bg-amber-50 text-amber-700"
      title="Not connected yet"
      body={`${feature} is ready on this screen, but the server does not offer it yet. It will fill in as soon as the backend provides it.`}
    />
  );
}

const ALERT_TONES = {
  info: { classes: "border-sky-200 bg-sky-50 text-sky-900", icon: Info },
  success: { classes: "border-leaf-200 bg-leaf-50 text-leaf-900", icon: CircleCheck },
  warning: { classes: "border-amber-200 bg-amber-50 text-amber-900", icon: TriangleAlert },
  error: { classes: "border-red-200 bg-red-50 text-red-800", icon: CircleAlert },
};

export function InlineAlert({ tone = "info", title, children, className = "" }) {
  const { classes, icon: Icon } = ALERT_TONES[tone] || ALERT_TONES.info;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl border p-3.5 text-sm ${classes} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
