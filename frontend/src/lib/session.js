// lib/session.js
// WHAT THIS FILE IS: remembers who is signed in, between page loads.
// WHAT IT DOES: saves the login token in the browser (localStorage) and reads it back.
// It also remembers the page someone was on when their login expired, so they can be
// sent back there after signing in again.
//
// SECURITY NOTE: localStorage can be read by any script running on the page, so this site
// must never load untrusted scripts. For a stricter setup later, the token can move to an
// "httpOnly" cookie set by the backend. That change would only touch this file and api.js.

const SESSION_KEY = "uploadhub.session";
const RETURN_KEY = "uploadhub.returnTo";
const LAST_ACTIVITY_KEY = "uploadhub.lastActivity";

export function recordActivity() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // Storage can be blocked.
  }
}

export function getLastActivity() {
  try {
    const val = localStorage.getItem(LAST_ACTIVITY_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

export function clearActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Nothing to do.
  }
}

// Reads the expiry time out of the token. This is only for knowing when to stop using it;
// the backend always does the real checking.
function readTokenExpiry(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function saveSession(token) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt: readTokenExpiry(token) }));
    recordActivity();
  } catch {
    // Storage can be blocked (private mode). The user stays signed in until the page closes.
  }
}

// Returns the saved token, or null when there is none or it has already expired.
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved.token) return null;
    if (saved.expiresAt && saved.expiresAt <= Date.now()) {
      clearSession();
      return { expired: true, token: null };
    }
    return { expired: false, token: saved.token };
  } catch {
    return null;
  }
}

export function getToken() {
  const session = loadSession();
  return session && session.token ? session.token : null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    clearActivity();
  } catch {
    // Nothing to do.
  }
}

// Remembers the page to return to after signing in again.
export function setReturnTo(path) {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    // Nothing to do.
  }
}

// Reads the remembered page and forgets it.
export function takeReturnTo() {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return path;
  } catch {
    return null;
  }
}
