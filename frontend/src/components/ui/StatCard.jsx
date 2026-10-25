// components/ui/StatCard.jsx
// WHAT THIS FILE IS: a small card with one headline number (for example "Active members: 24").
// WHAT IT DOES: shows an icon, a label, a big value and an optional line of detail. The
// value always comes from the backend; this component never invents numbers.

export default function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-100 text-leaf-800">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-ink">{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}
