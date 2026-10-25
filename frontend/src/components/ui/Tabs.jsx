// components/ui/Tabs.jsx
// WHAT THIS FILE IS: a row of tabs for switching between views on one screen.
// WHAT IT DOES: shows the tabs, marks the chosen one, and calls onChange(key) when a tab is
// picked. Left and Right arrow keys move between tabs. On a phone the row scrolls sideways.
//
// Example: <Tabs label="Storage range" value={days} onChange={setDays}
//                items={[{ key: 7, label: "7 days" }, { key: 30, label: "30 days" }]} />

export default function Tabs({ items, value, onChange, label }) {
  function onKeyDown(event) {
    const index = items.findIndex((item) => item.key === value);
    if (event.key === "ArrowRight") onChange(items[(index + 1) % items.length].key);
    if (event.key === "ArrowLeft") onChange(items[(index - 1 + items.length) % items.length].key);
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              selected ? "bg-leaf-600 text-white shadow-sm" : "text-muted hover:bg-leaf-100 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
