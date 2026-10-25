// components/ui/Fields.jsx
// WHAT THIS FILE IS: every form control the website uses.
// WHAT IT DOES: text boxes, password boxes (with a show/hide button), drop-down lists,
// multi-line boxes, tick boxes and on/off switches. Each one has a proper label, optional
// help text, and an error message that is read out by screen readers.
//
// Example: <TextField label="Email" type="email" value={email} onChange={...} error="Enter a valid email" />

import { useId, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff } from "../../lib/icons";

// Shared look of the box itself.
function boxClasses(hasError, hasIcon, extra = "") {
  return `w-full rounded-xl border bg-white text-sm text-ink transition placeholder:text-muted/70 focus:border-leaf-600 focus:outline-none focus:ring-4 focus:ring-leaf-100 disabled:bg-leaf-50 disabled:text-muted ${
    hasError ? "border-red-400" : "border-line hover:border-leaf-300"
  } ${hasIcon ? "pl-10" : "px-3.5"} ${extra}`;
}

// The label above a field, and the message below it (error first, otherwise help text).
function FieldFrame({ id, label, hint, error, children, className = "" }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id, error, hint) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({ label, hint, error, id, className = "", inputClassName = "", icon: Icon, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={boxClasses(error, Icon, `h-11 ${inputClassName}`)}
          {...rest}
        />
      </div>
    </FieldFrame>
  );
}

// A password box with an eye button that shows or hides what was typed.
export function PasswordField({ label, hint, error, id, className = "", ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={boxClasses(error, false, "h-11 pr-11")}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-leaf-100 hover:text-ink"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </FieldFrame>
  );
}

// A drop-down list. Pass <option> elements as children.
export function SelectField({ label, hint, error, id, className = "", children, ...rest }) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <FieldFrame id={selectId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, error, hint)}
          className={boxClasses(error, false, "h-11 appearance-none pr-10")}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
    </FieldFrame>
  );
}

export function TextAreaField({ label, hint, error, id, className = "", rows = 4, ...rest }) {
  const autoId = useId();
  const areaId = id || autoId;
  return (
    <FieldFrame id={areaId} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(areaId, error, hint)}
        className={boxClasses(error, false, "py-2.5")}
        {...rest}
      />
    </FieldFrame>
  );
}

// A tick box with a label (and optional smaller description under it).
export function CheckboxField({ label, description, id, className = "", checked, onChange, disabled, ...rest }) {
  const autoId = useId();
  const boxId = id || autoId;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={boxId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-line bg-white transition checked:border-leaf-600 checked:bg-leaf-600 hover:border-leaf-400 disabled:cursor-not-allowed disabled:opacity-50"
          {...rest}
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      <label htmlFor={boxId} className={`text-sm ${disabled ? "text-muted" : "cursor-pointer text-ink"}`}>
        <span className="font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-muted">{description}</span> : null}
      </label>
    </div>
  );
}

// An on/off switch. Reads as a "switch" to screen readers.
export function SwitchField({ label, description, checked, onChange, disabled = false, className = "" }) {
  const id = useId();
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-muted">{description}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
          checked ? "bg-leaf-600" : "bg-leaf-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
