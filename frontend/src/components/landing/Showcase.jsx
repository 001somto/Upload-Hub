// components/landing/Showcase.jsx
// WHAT THIS FILE IS: the "See the app" slideshow on the landing page.
// WHAT IT DOES: shows four illustrated screens of UploadHub (files, sharing, storage,
// audit trail) one at a time, each in a browser frame, with a tab for each. The slides
// advance by themselves; the little bar under the active tab fills as the time passes.
// - Hovering or focusing the area pauses it.
// - For visitors who prefer reduced motion it never moves by itself; they use the tabs.
// - The tabs also work with the Left and Right arrow keys.
// The pictures are illustrations (hidden from screen readers); the tab text explains them.

import { useState } from "react";
import useReducedMotion from "../../hooks/useReducedMotion";
import Reveal from "../ui/Reveal";
import { AuditScreen, FilesScreen, ShareScreen, StorageScreen, WindowFrame } from "./Illustrations";

const SLIDES = [
  {
    key: "files",
    tab: "Files and folders",
    title: "Find any file in seconds",
    text: "Browse folders, search by name, upload several files at once and open images and PDFs without leaving the page.",
    address: "uploadhub.app/files",
    Screen: FilesScreen,
  },
  {
    key: "share",
    tab: "Sharing",
    title: "Share with a link that expires",
    text: "Pick how long a link lasts, copy it, and turn it off whenever you like. Every time someone opens it, the server checks it is still valid.",
    address: "uploadhub.app/share",
    Screen: ShareScreen,
  },
  {
    key: "storage",
    tab: "Storage",
    title: "See where the space goes",
    text: "Admins see department usage, how much is left, and which members use the most. Everyone sees their own storage at a glance.",
    address: "uploadhub.app/analytics",
    Screen: StorageScreen,
  },
  {
    key: "audit",
    tab: "Audit trail",
    title: "Know who did what",
    text: "Uploads, downloads, shares and membership decisions are recorded on the server, so department Admins can always check the history.",
    address: "uploadhub.app/audit",
    Screen: AuditScreen,
  },
];

export default function Showcase() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const autoplay = !reduced;

  function next() {
    setActive((current) => (current + 1) % SLIDES.length);
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setActive((current) => (current + 1) % SLIDES.length);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((current) => (current - 1 + SLIDES.length) % SLIDES.length);
    }
  }

  return (
    <section id="showcase" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-leaf-950 sm:text-4xl">See what working in UploadHub looks like</h2>
          <p className="mt-4 text-lg text-muted">A quick tour of the screens you will use every day.</p>
        </Reveal>

        <div
          className="mt-12 grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* The tabs: a row on phones, a column beside the picture on large screens. */}
          <div role="tablist" aria-label="App screens" aria-orientation="vertical" onKeyDown={onKeyDown} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SLIDES.map((slide, index) => {
              const selected = index === active;
              return (
                <button
                  key={slide.key}
                  id={`showcase-tab-${slide.key}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`showcase-panel-${slide.key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(index)}
                  className={`relative min-w-[13rem] shrink-0 overflow-hidden rounded-2xl border p-4 text-left transition duration-200 lg:min-w-0 ${
                    selected ? "border-leaf-300 bg-leaf-50 shadow-soft" : "border-transparent hover:bg-leaf-50/70"
                  }`}
                >
                  <span className={`block text-base font-bold ${selected ? "text-leaf-900" : "text-ink"}`}>{slide.tab}</span>
                  <span className={`mt-1 block text-sm ${selected ? "text-muted" : "hidden text-muted lg:block lg:line-clamp-1"}`}>{slide.title}</span>
                  {selected && autoplay ? (
                    // This bar fills over 6 seconds. When it finishes, the next slide shows.
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-leaf-100">
                      <span
                        key={`${active}`}
                        onAnimationEnd={next}
                        className="block h-full origin-left animate-fill bg-leaf-500"
                        style={{ animationPlayState: paused ? "paused" : "running" }}
                      />
                    </span>
                  ) : selected ? (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-leaf-500" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* The pictures. All slides sit in the same grid cell so the frame never jumps in size. */}
          <div>
            <div className="grid">
              {SLIDES.map((slide, index) => {
                const selected = index === active;
                return (
                  <div
                    key={slide.key}
                    id={`showcase-panel-${slide.key}`}
                    role="tabpanel"
                    aria-labelledby={`showcase-tab-${slide.key}`}
                    aria-hidden={!selected}
                    className={`[grid-area:1/1] transition duration-500 ${selected ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                  >
                    <WindowFrame address={slide.address}>
                      <slide.Screen />
                    </WindowFrame>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 min-h-[4.5rem]" aria-live="polite">
              <p className="text-lg font-bold text-ink">{SLIDES[active].title}</p>
              <p className="mt-1 max-w-xl text-muted">{SLIDES[active].text}</p>
            </div>
            <p className="mt-2 text-xs text-muted/80">The screens above are illustrations of the app.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
