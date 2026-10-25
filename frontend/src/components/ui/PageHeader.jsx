// components/ui/PageHeader.jsx
// WHAT THIS FILE IS: the title block at the top of each signed-in screen.
// WHAT IT DOES: shows the screen title, a one-line description and (on the right) the
// main buttons for that screen.

export default function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
