// components/ui/Card.jsx
// WHAT THIS FILE IS: the white rounded panel used to group content.
// WHAT IT DOES: `Card` is the panel; `CardHeader` adds a title, an optional short
// description and an optional area for buttons on the right.

export default function Card({ as: Tag = "section", padded = true, className = "", children, ...rest }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-white shadow-soft ${padded ? "p-5 sm:p-6" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, className = "" }) {
  return (
    <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
