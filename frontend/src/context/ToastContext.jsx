// context/ToastContext.jsx
// WHAT THIS FILE IS: the small pop-up messages ("Link copied", "Folder created").
// WHAT IT DOES: any page can call `const { toast } = useToast()` and then
// `toast({ title: "Saved", message: "Your name was updated." })`. Messages appear at the
// bottom of the screen and disappear by themselves after five seconds.
// Tones: "success" (default), "error", "info".

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "../lib/icons";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CircleCheck, classes: "text-leaf-700" },
  error: { icon: CircleAlert, classes: "text-red-600" },
  info: { icon: Info, classes: "text-sky-600" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message = "", tone = "success" }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, title, message, tone }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live makes screen readers read new messages out loud. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((item) => {
          const tone = TONES[item.tone] || TONES.success;
          const Icon = tone.icon;
          return (
            <div
              key={item.id}
              className="pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-lift"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.classes}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.message ? <p className="mt-0.5 text-sm text-muted">{item.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="rounded-lg p-1 text-muted transition hover:bg-leaf-100 hover:text-ink"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
