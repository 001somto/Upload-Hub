// context/AuthContext.jsx
// WHAT THIS FILE IS: the website's memory of "who is signed in".
// WHAT IT DOES: keeps the signed-in user and login status where every page can read it
// with `useAuth()`. It signs people in and out, restores a saved login when the page
// reloads, and signs people out cleanly when their login expires (after 8 hours).
//
// `status` is one of:
//   "loading"     -> checking a saved login with the backend
//   "signedOut"   -> nobody is signed in
//   "signedIn"    -> `user` holds the account
//   "unreachable" -> a saved login exists but the backend could not be reached

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api, isNetworkError, setUnauthorizedHandler } from "../lib/api";
import { clearSession, loadSession, saveSession, setReturnTo } from "../lib/session";

const AuthContext = createContext(null);

// Where each kind of account lands after signing in.
export function homePathFor(role) {
  return role === "admin" ? "/admin" : "/app";
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  // True when a login ran out, so the sign-in page can explain why the person is back.
  const [expiredNotice, setExpiredNotice] = useState(false);

  // Ends the session in the browser. `expired` is true when it ended on its own.
  const endSession = useCallback((expired) => {
    clearSession();
    setUser(null);
    setStatus("signedOut");
    if (expired) setExpiredNotice(true);
  }, []);

  // When any signed-in request is refused with 401, remember the current page and sign out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setReturnTo(window.location.pathname + window.location.search);
      endSession(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // On first load: if a login was saved, ask the backend who it belongs to.
  const restoreSession = useCallback(async () => {
    const saved = loadSession();
    if (!saved) {
      setStatus("signedOut");
      return;
    }
    if (saved.expired || !saved.token) {
      setReturnTo(window.location.pathname + window.location.search);
      setExpiredNotice(true);
      setStatus("signedOut");
      return;
    }
    setStatus("loading");
    try {
      const data = await api.users.me();
      setUser(data.user);
      setStatus("signedIn");
    } catch (error) {
      if (isNetworkError(error)) setStatus("unreachable");
      // A 401 is handled by the handler above, which already signed the person out.
      else if (!(error instanceof ApiError) || error.status !== 401) endSession(false);
    }
  }, [endSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Signs in. `expectedRole` is the sign-in page the person used ("admin" or "user").
  const signIn = useCallback(async ({ email, password, expectedRole }) => {
    const data = await api.auth.login({ email, password, expectedRole });
    // Safety net: even if the backend let it through, refuse a role that does not match.
    if (expectedRole && data.user.role !== expectedRole) {
      throw new ApiError({
        status: 403,
        code: "WRONG_ACCOUNT_TYPE",
        message: `This is ${data.user.role === "admin" ? "an Admin" : "a User"} account. Use the ${
          data.user.role === "admin" ? "Admin" : "User"
        } sign-in page instead.`,
      });
    }
    saveSession(data.token);
    setUser(data.user);
    setStatus("signedIn");
    setExpiredNotice(false);
    return data.user;
  }, []);

  // Creates an account and signs it in. `role` is "admin" or "user".
  const signUp = useCallback(async (role, form) => {
    const call = role === "admin" ? api.auth.registerAdmin : api.auth.registerUser;
    const data = await call(form);
    saveSession(data.token);
    setUser(data.user);
    setStatus("signedIn");
    setExpiredNotice(false);
    return data.user;
  }, []);

  const signOut = useCallback(() => endSession(false), [endSession]);

  // Re-reads the account from the backend (for example after a membership change).
  const refreshUser = useCallback(async () => {
    const data = await api.users.me();
    setUser(data.user);
    return data.user;
  }, []);

  const clearExpiredNotice = useCallback(() => setExpiredNotice(false), []);

  const value = useMemo(
    () => ({
      status,
      user,
      expiredNotice,
      signIn,
      signUp,
      signOut,
      refreshUser,
      setUser,
      restoreSession,
      clearExpiredNotice,
    }),
    [status, user, expiredNotice, signIn, signUp, signOut, refreshUser, restoreSession, clearExpiredNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
