// pages/auth/SignUpPage.jsx
// WHAT THIS FILE IS: the sign-up form. Two entry paths share this file:
// /signup/user and /signup/admin (the `role` prop says which one).
// WHAT IT DOES: anyone can sign up as a User or as an Admin, with no approval step.
//   User  -> name, email, password. Gets an independent workspace; no department needed.
//   Admin -> the same, plus the name and short code of the department they are creating.
// The role is decided by which page is used and the backend enforces it. Admin sign-up
// needs the department service from the backend teammate; until it exists the server
// answers "not connected" and this page explains that.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { homePathFor, useAuth } from "../../context/AuthContext";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, isNotConnected } from "../../lib/api";
import { Building2, Mail, UserPlus } from "../../lib/icons";
import {
  PASSWORD_HINT, hasNoErrors, validateConfirm, validateDepartmentCode, validateDepartmentName,
  validateEmail, validateName, validatePassword,
} from "../../lib/validation";
import Button from "../../components/ui/Button";
import { PasswordField, TextField } from "../../components/ui/Fields";
import { InlineAlert } from "../../components/ui/Feedback";

export default function SignUpPage({ role }) {
  const isAdmin = role === "admin";
  useDocumentTitle(isAdmin ? "Admin sign up" : "User sign up");

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", departmentName: "", departmentCode: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null); // { message, notConnected }
  const [busy, setBusy] = useState(false);

  function update(field, transform = (value) => value) {
    return (event) => setForm((current) => ({ ...current, [field]: transform(event.target.value) }));
  }

  function check() {
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
    };
    if (isAdmin) {
      next.departmentName = validateDepartmentName(form.departmentName);
      next.departmentCode = validateDepartmentCode(form.departmentCode);
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = check();
    setErrors(next);
    setFormError(null);
    if (!hasNoErrors(next)) return;

    setBusy(true);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), password: form.password };
      if (isAdmin) {
        payload.departmentName = form.departmentName.trim();
        payload.departmentCode = form.departmentCode;
      }
      const user = await signUp(role, payload);
      navigate(homePathFor(user.role), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      setFormError({
        message: error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        notConnected: isNotConnected(error),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">{isAdmin ? "Create an Admin account" : "Create a User account"}</h1>
      <p className="mt-2 text-muted">
        {isAdmin
          ? "You will create a new department and manage its members and files. Each department has one Admin."
          : "You get your own workspace right away. You can join a department later."}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {formError ? (
          <InlineAlert
            tone={formError.notConnected ? "warning" : "error"}
            title={formError.notConnected ? "Admin sign-up is not available yet" : "Could not create your account"}
          >
            {formError.notConnected
              ? "Creating a department needs a service that is not connected to this server yet. User accounts work now."
              : formError.message}
          </InlineAlert>
        ) : null}

        <TextField label="Full name" autoComplete="name" value={form.name} onChange={update("name")} error={errors.name} />
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

        {isAdmin ? (
          <>
            <TextField
              label="Department name"
              icon={Building2}
              value={form.departmentName}
              onChange={update("departmentName")}
              error={errors.departmentName}
              placeholder="Computer Science"
            />
            <TextField
              label="Department code"
              value={form.departmentCode}
              onChange={update("departmentCode", (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              error={errors.departmentCode}
              hint="Short and easy to remember, like CSC. Members can use it to find or join your department."
              placeholder="CSC"
              inputClassName="uppercase tracking-wider"
            />
          </>
        ) : null}

        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          hint={errors.password ? undefined : PASSWORD_HINT}
        />
        <PasswordField label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} error={errors.confirm} />

        <Button type="submit" size="lg" className="w-full" icon={UserPlus} loading={busy}>
          Create account
        </Button>
      </form>

      <div className="mt-8 space-y-2 text-sm text-muted">
        <p>
          Already have an account?{" "}
          <Link className="font-semibold text-leaf-800 underline-offset-2 hover:underline" to={`/signin/${role}`}>
            Sign in
          </Link>
        </p>
        <p>
          {isAdmin ? "Want to join a department instead? " : "Want to run a department? "}
          <Link className="font-semibold text-leaf-800 underline-offset-2 hover:underline" to={`/signup/${isAdmin ? "user" : "admin"}`}>
            {isAdmin ? "Create a User account" : "Register as an Admin"}
          </Link>
        </p>
      </div>
    </div>
  );
}
