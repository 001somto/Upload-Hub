// pages/auth/SignInPage.jsx
// WHAT THIS FILE IS: the sign-in form. There are two entry paths that share this file:
// /signin/user and /signin/admin (the `role` prop says which one).
// WHAT IT DOES: checks the form, signs the person in through the backend, and sends them
// to their dashboard (or back to the page they were on). If a User signs in on the Admin
// page (or the reverse) the backend refuses, and this page points them to the right one.

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homePathFor, useAuth } from "../../context/AuthContext";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/api";
import { LogIn, Mail } from "../../lib/icons";
import { takeReturnTo } from "../../lib/session";
import { validateEmail } from "../../lib/validation";
import Button from "../../components/ui/Button";
import { PasswordField, TextField } from "../../components/ui/Fields";
import { InlineAlert } from "../../components/ui/Feedback";
import { settings } from "../../config/settings";

// Only send people back to pages that belong to their own area (never to another site).
function safeReturnPath(path, role) {
  if (!path || typeof path !== "string" || !path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.startsWith("/share/")) return path;
  if (role === "admin" && (path === "/admin" || path.startsWith("/admin/"))) return path;
  if (role === "user" && (path === "/app" || path.startsWith("/app/"))) return path;
  return null;
}

export default function SignInPage({ role }) {
  const isAdmin = role === "admin";
  useDocumentTitle(isAdmin ? "Admin sign in" : "User sign in");

  const { signIn, expiredNotice, clearExpiredNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null); // { message, wrongType }
  const [busy, setBusy] = useState(false);

  const otherRole = isAdmin ? "user" : "admin";

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(form.email),
      password: form.password ? "" : "Enter your password.",
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) return;

    setBusy(true);
    clearExpiredNotice();
    try {
      const user = await signIn({ email: form.email.trim(), password: form.password, expectedRole: role });
      const remembered = safeReturnPath(location.state && location.state.from, user.role) || safeReturnPath(takeReturnTo(), user.role);
      navigate(remembered || homePathFor(user.role), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "WRONG_ACCOUNT_TYPE") {
        setFormError({ message: error.message, wrongType: true });
      } else if (error instanceof ApiError && error.fields) {
        setErrors(error.fields);
        setFormError({ message: error.message });
      } else {
        setFormError({ message: error instanceof ApiError ? error.message : "Something went wrong. Please try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">{isAdmin ? "Admin sign in" : "User sign in"}</h1>
      <p className="mt-2 text-muted">
        {isAdmin ? "Manage your department, its members and its files." : "Open your files, your department and your share links."}
      </p>

      {expiredNotice ? (
        <InlineAlert tone="warning" className="mt-6" title="Your session ended">
          For your safety you are signed out after {settings.sessionHours} hours. Sign in again to continue where you left off.
        </InlineAlert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {formError ? (
          <InlineAlert tone="error" title={formError.wrongType ? "Wrong sign-in page" : "Could not sign you in"}>
            {formError.message}
            {formError.wrongType ? (
              <>
                {" "}
                <Link className="font-semibold underline" to={`/signin/${otherRole}`}>
                  Go to {otherRole === "admin" ? "Admin" : "User"} sign in
                </Link>
              </>
            ) : null}
          </InlineAlert>
        ) : null}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          icon={Mail}
          value={form.email}
          onChange={update("email")}
          error={errors.email}
          placeholder="you@example.com"
        />
        <PasswordField label="Password" autoComplete="current-password" value={form.password} onChange={update("password")} error={errors.password} />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-leaf-800 underline-offset-2 hover:underline">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" icon={LogIn} loading={busy}>
          Sign in
        </Button>
      </form>

      <div className="mt-8 space-y-2 text-sm text-muted">
        <p>
          New here?{" "}
          <Link className="font-semibold text-leaf-800 underline-offset-2 hover:underline" to={`/signup/${role}`}>
            Create {isAdmin ? "an Admin" : "a User"} account
          </Link>
        </p>
        <p>
          Not {isAdmin ? "an Admin" : "a User"}?{" "}
          <Link className="font-semibold text-leaf-800 underline-offset-2 hover:underline" to={`/signin/${otherRole}`}>
            Go to {otherRole === "admin" ? "Admin" : "User"} sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
