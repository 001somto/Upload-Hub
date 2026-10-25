// middleware/errorHandler.js
// WHAT THIS FILE IS: the single place where every error becomes an answer for the website.
// WHAT IT DOES: answers always look like { error: { code, message, fields } }. Unexpected
// errors are logged here but the browser only sees a generic message (no internals leak).

import { AppError } from "../utils/errors.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: "That address does not exist on this server." } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } });
  }
  if (error && error.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_JSON", message: "The request was not valid JSON." } });
  }
  if (error && error.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "That request is too large." } });
  }
  console.error("Unexpected error:", error);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Something went wrong on the server. Please try again." } });
}
