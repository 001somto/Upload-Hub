// pages/auth/ResetPasswordPage.jsx
// WHAT THIS FILE IS: the page a reset link opens (/reset-password?token=...).
// WHAT IT DOES: lets the person choose a new password. The token in the link works once
// and expires quickly; the backend checks it. After success it points to the sign-in pages.

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api } from "../../lib/api";
import { CircleCheck } from "../../lib/icons";
import { PASSWORD_HINT, validateConfirm, validatePassword } from "../../lib/validation";
import Button from "../../components/ui/Button";
import { PasswordField } from "../../components/ui/Fields";
import { InlineAlert } from "../../components/ui/Feedback";

export default function ResetPasswordPage() {
  useDocumentTitle("Choose a new password");
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold text-ink">This link is not complete</h1>
        <p className="mt-2 text-muted">Open the reset link exactly as it was sent to you, or request a new one.</p>
        <Button to="/forgot-password" className="mt-6">
          Request a new link
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-700">
          <CircleCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-extrabold text-ink">Password changed</h1>
        <p className="mt-2 text-muted">You can now sign in with your new password.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button to="/signin/user">User sign in</Button>
          <Button to="/signin/admin" variant="secondary">
            Admin sign in
          </Button>
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = { password: validatePassword(form.password), confirm: validateConfirm(form.password, form.confirm) };
    setErrors(next);
    setFormError("");
    if (next.password || next.confirm) return;

    setBusy(true);
    try {
      await api.auth.resetPassword({ token, password: form.password });
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.fields) setErrors(caught.fields);
      setFormError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">Choose a new password</h1>
      <p className="mt-2 text-muted">Pick something you have not used elsewhere.</p>
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {formError ? (
          <InlineAlert tone="error" title="Could not change your password">
            {formError}{" "}
            <Link className="font-semibold underline" to="/forgot-password">
              Request a new link
            </Link>
          </InlineAlert>
        ) : null}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          error={errors.password}
          hint={errors.password ? undefined : PASSWORD_HINT}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Change password
        </Button>
      </form>
    </div>
  );
}
