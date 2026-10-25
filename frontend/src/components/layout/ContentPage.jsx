// components/layout/ContentPage.jsx
// WHAT THIS FILE IS: the simple layout for text pages (About, Help, Privacy, Contact).
// WHAT IT DOES: a title, a short introduction and a narrow column of readable text.

import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function ContentPage({ title, intro, children }) {
  useDocumentTitle(title);
  return (
    <div className="bg-gradient-to-b from-leaf-100/70 to-paper">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">{title}</h1>
        {intro ? <p className="mt-4 text-lg text-muted">{intro}</p> : null}
        <div className="mt-10 space-y-8 text-base leading-7 text-ink/90">{children}</div>
      </div>
    </div>
  );
}

// A heading plus text inside a ContentPage.
export function ContentSection({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-muted">{children}</div>
    </section>
  );
}
