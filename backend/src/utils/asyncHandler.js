// utils/asyncHandler.js
// WHAT THIS FILE IS: a small helper for route functions that wait for things (database calls).
// WHAT IT DOES: if such a function fails, the error is passed to the error handler instead of
// crashing the server or leaving the request hanging.

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
