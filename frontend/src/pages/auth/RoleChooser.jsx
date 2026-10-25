// pages/auth/RoleChooser.jsx
// WHAT THIS FILE IS: the "Are you a User or an Admin?" page, for both sign in and sign up.
// WHAT IT DOES: shows two clear cards so people pick the right path before they enter a
// form. `mode` is "signin" or "signup".

import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ArrowRight, Building2, User } from "../../lib/icons";

export default function RoleChooser({ mode }) {
  const signIn = mode === "signin";
  useDocumentTitle(signIn ? "Sign in" : "Create an account");

  const options = [
    {
      role: "user",
      icon: User,
      title: "User",
      text: signIn
        ? "Sign in to your files, your department and your share links."
        : "Get your own workspace, then join a department when you are ready.",
    },
    {
      role: "admin",
      icon: Building2,
      title: "Admin",
      text: signIn
        ? "Sign in to manage your department, its members and its files."
        : "Create a department and manage its members and files.",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">{signIn ? "Sign in" : "Create your account"}</h1>
      <p className="mt-2 text-muted">{signIn ? "Which kind of account do you have?" : "Which kind of account do you need?"}</p>
      <div className="mt-8 space-y-4">
        {options.map(({ role, icon: Icon, title, text }) => (
          <Link
            key={role}
            to={`/${mode}/${role}`}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-lift"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-800 transition group-hover:bg-leaf-600 group-hover:text-white">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-ink">{title}</span>
              <span className="mt-0.5 block text-sm text-muted">{text}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-leaf-700" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">
        {signIn ? "New to UploadHub? " : "Already have an account? "}
        <Link className="font-semibold text-leaf-800 underline-offset-2 hover:underline" to={signIn ? "/signup" : "/signin"}>
          {signIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
