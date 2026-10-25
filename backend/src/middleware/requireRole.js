// middleware/requireRole.js
// WHAT THIS FILE IS: a gate that only lets one type of account through.
// WHAT IT DOES: use requireRole("admin") after authenticate to block everyone else (403).

import { forbidden } from "../utils/errors.js";

export const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) return next(forbidden("You do not have permission to do that."));
  next();
};
