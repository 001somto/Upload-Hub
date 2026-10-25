// middleware/authenticate.js
// WHAT THIS FILE IS: the "ID check" that runs before any route that needs a signed-in person.
// WHAT IT DOES: reads the token from the "Authorization: Bearer ..." header, checks it, then
// loads the account from the database on EVERY request (so a changed role, a paused account
// or a password change takes effect immediately). Puts the account on req.user.
// The teammate: use this on all your protected routes, and requireRole() for Admin-only ones.

import { unauthorized } from "../utils/errors.js";

export function createAuthenticate({ users, tokens }) {
  return async function authenticate(req, res, next) {
    try {
      const header = req.headers.authorization || "";
      const match = /^Bearer (.+)$/.exec(header);
      if (!match) throw unauthorized();
      const claims = tokens.verify(match[1]);
      if (!claims) throw unauthorized("Your session has expired. Please sign in again.", "SESSION_EXPIRED");
      const user = await users.findById(claims.userId);
      if (!user || (user.tokenVersion || 0) !== claims.tokenVersion) {
        throw unauthorized("Your session has expired. Please sign in again.", "SESSION_EXPIRED");
      }
      // Role comes from the database, never from the token alone.
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
