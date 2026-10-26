// middleware/authenticate.js
// Reads the token from the "Authorization: Bearer ..." header and loads account to req.user.

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
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createOptionalAuthenticate({ users, tokens }) {
  return async function optionalAuthenticate(req, res, next) {
    try {
      const header = req.headers.authorization || "";
      const match = /^Bearer (.+)$/.exec(header);
      if (!match) {
        req.user = null;
        return next();
      }
      const claims = tokens.verify(match[1]);
      if (!claims) {
        req.user = null;
        return next();
      }
      const user = await users.findById(claims.userId);
      if (!user || (user.tokenVersion || 0) !== claims.tokenVersion) {
        req.user = null;
        return next();
      }
      req.user = user;
      next();
    } catch {
      req.user = null;
      next();
    }
  };
}
