// utils/errors.js
// WHAT THIS FILE IS: one kind of error the whole backend uses for "expected" problems.
// WHAT IT DOES: carries an HTTP status, a short machine code (the frontend reads it) and a
// plain message. The error handler turns it into { error: { code, message, fields } }.

export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message, fields, code = "VALIDATION_ERROR") => new AppError(400, code, message, fields);
export const unauthorized = (message = "Please sign in to continue.", code = "UNAUTHORIZED") => new AppError(401, code, message);
export const forbidden = (message, code = "FORBIDDEN") => new AppError(403, code, message);
export const notFound = (message = "That was not found.", code = "NOT_FOUND") => new AppError(404, code, message);
export const conflict = (message, fields, code = "CONFLICT") => new AppError(409, code, message, fields);
