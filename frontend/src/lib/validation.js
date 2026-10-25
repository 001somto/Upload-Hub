// lib/validation.js
// WHAT THIS FILE IS: the rules for what people may type into forms.
// WHAT IT DOES: each function returns "" when the value is fine, or a short message that
// explains what to fix. These checks give instant feedback in the browser; the backend
// repeats every one of them (browser checks are a convenience, never security).
// Keep these rules in step with backend/src/utils/validators.js.

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

export function validateName(name) {
  const value = name.trim();
  if (value.length < 2) return "Enter your full name.";
  if (value.length > 80) return "Use 80 characters or fewer.";
  return "";
}

export function validateEmail(email) {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
  return "";
}

export function validatePassword(password) {
  if (password.length < 8) return PASSWORD_HINT;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return PASSWORD_HINT;
  if (new TextEncoder().encode(password).length > 72) return "Use 72 characters or fewer.";
  return "";
}

export function validateConfirm(password, confirm) {
  return password === confirm ? "" : "The passwords do not match.";
}

export function validateDepartmentName(value) {
  const text = value.trim();
  if (text.length < 3) return "Enter the department name.";
  if (text.length > 80) return "Use 80 characters or fewer.";
  return "";
}

// Department codes are short, typed in capitals, e.g. CSC. Letters and numbers only.
export function validateDepartmentCode(value) {
  return /^[A-Z0-9]{2,10}$/.test(value) ? "" : "Use 2 to 10 letters or numbers, for example CSC.";
}

// True when none of the messages in the object has any text.
export function hasNoErrors(errors) {
  return Object.values(errors).every((message) => !message);
}
