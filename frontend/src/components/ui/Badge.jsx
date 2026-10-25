// components/ui/Badge.jsx
// WHAT THIS FILE IS: the small coloured label used for statuses ("Active", "Expired").
// WHAT IT DOES: shows a short word in a rounded pill. The colour (tone) is never the only
// clue: the word itself always says what the status is.
// Tones: "neutral", "green", "amber", "red", "blue".

const TONES = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-leaf-100 text-leaf-800 ring-leaf-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
};

export default function Badge({ tone = "neutral", icon: Icon, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
