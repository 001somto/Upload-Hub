// components/layout/RouteGuards.jsx
// WHAT THIS FILE IS: the "doormen" of the website.
// WHAT IT DOES:
//   RequireRole -> wraps the User area (role "user") and the Admin area (role "admin").
//                  Signed-out visitors are sent to the right sign-in page; people with the
//                  wrong role are sent to their own area.
//   GuestOnly   -> wraps the sign-in and sign-up pages; people who are already signed in
//                  are sent straight to their dashboard.
// REMEMBER: these only improve the experience. The backend checks every request again,
// so hiding a page here is never what keeps data safe.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homePathFor, useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { Spinner } from "../ui/Feedback";
import Logo from "../ui/Logo";

function FullPage({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <Logo />
      {children}
    </div>
  );
}

function CheckingSession() {
  return (
    <FullPage>
      <div role="status" className="flex items-center gap-3 text-muted">
        <Spinner />
        <span>Checking your session</span>
      </div>
    </FullPage>
  );
}

function ServerUnreachable({ onRetry }) {
  return (
    <FullPage>
      <div role="alert" className="max-w-sm">
        <h1 className="text-xl font-bold text-ink">Cannot reach the server</h1>
        <p className="mt-2 text-sm text-muted">
          You are still signed in, but the server did not answer. Check your connection, and that the backend is running, then try again.
        </p>
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </FullPage>
  );
}

export function RequireRole({ role, children }) {
  const { status, user, restoreSession } = useAuth();
  const location = useLocation();

  if (status === "loading") return <CheckingSession />;
  if (status === "unreachable") return <ServerUnreachable onRetry={restoreSession} />;
  if (status === "signedOut") {
    // `state.from` lets the sign-in page send the person back here afterwards.
    return <Navigate to={`/signin/${role}`} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user && user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return children || <Outlet />;
}

export function GuestOnly() {
  const { status, user } = useAuth();
  if (status === "loading") return <CheckingSession />;
  if (status === "signedIn" && user) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
