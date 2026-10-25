// pages/auth/ForgotPasswordPage.jsx
// WHAT THIS FILE IS: the "Forgot your password?" page, reached from both sign-in pages.
// WHAT IT DOES: asks for an email address and tells the backend. The backend gives the
// SAME answer whether or not the address has an account (so nobody can use this page to
// discover who is registered). This page shows the backend's own message, which says
// honestly whether an email could be sent - it never claims an email was sent by itself.

import { useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api } from "../../lib/api";
import { ArrowLeft, Mail } from "../../lib/icons";
import { validateEmail } from "../../lib/validation";
import Button from "../../components/ui/Button";
import { TextField } from "../../components/ui/Fields";
import { InlineAlert } from "../../components/ui/Feedback";

export default function ForgotPasswordPage() {
  useDocumentTitle("Forgot password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // the backend's message
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = validateEmail(email);
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      const data = await api.auth.forgotPassword({ email: email.trim() });
      setResult({ tone: "info", message: (data && data.message) || "Your request was received." });
    } catch (caught) {
      setResult({ tone: "error", message: caught instanceof ApiError ? caught.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">Reset your password</h1>
      <p className="mt-2 text-muted">Enter the email you signed up with. If an account exists, you will get a link to choose a new password.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {result ? (
          <InlineAlert tone={result.tone} title={result.tone === "error" ? "Could not send the request" : "Request received"}>
            {result.message}
          </InlineAlert>
        ) : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          icon={Mail}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
          placeholder="you@example.com"
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Send reset link
        </Button>
      </form>

      <Link to="/signin" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </div>
  );
}
