// utils/validators.js
// WHAT THIS FILE IS: the rules for what is allowed in each field.
// WHAT IT DOES: each check returns "" when fine or a message. The frontend has the same
// rules in frontend/src/lib/validation.js - keep the two in step. These run again here
// because browser checks are only a convenience, never security.

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

// The notification choices a person may switch on or off (must match the Settings page).
export const NOTIFICATION_KEYS = ["uploadConfirmations", "shareLinkExpiry", "membershipUpdates", "securityAlerts"];

export function defaultNotificationPreferences() {
  return Object.fromEntries(NOTIFICATION_KEYS.map((key) => [key, true]));
}

export const isString = (value) => typeof value === "string";

export function checkName(value) {
  if (!isString(value)) return "Enter your full name.";
  const text = value.trim();
  if (text.length < 2) return "Enter your full name.";
  if (text.length > 80) return "Use 80 characters or fewer.";
  return "";
}

export function normaliseEmail(value) {
  return isString(value) ? value.trim().toLowerCase() : "";
}

export function checkEmail(value) {
  const text = normaliseEmail(value);
  if (!text) return "Enter your email address.";
  if (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Enter a valid email address.";
  return "";
}

export function checkPassword(value) {
  if (!isString(value) || value.length < 8) return PASSWORD_HINT;
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return PASSWORD_HINT;
  // bcrypt only uses the first 72 bytes, so longer passwords are refused instead of silently cut.
  if (Buffer.byteLength(value, "utf8") > 72) return "Use 72 characters or fewer.";
  return "";
}

export function checkDepartmentName(value) {
  if (!isString(value)) return "Enter the department name.";
  const text = value.trim();
  if (text.length < 3) return "Enter the department name.";
  if (text.length > 80) return "Use 80 characters or fewer.";
  return "";
}

export function normaliseDepartmentCode(value) {
  return isString(value) ? value.trim().toUpperCase() : "";
}

export function checkDepartmentCode(value) {
  return /^[A-Z0-9]{2,10}$/.test(normaliseDepartmentCode(value)) ? "" : "Use 2 to 10 letters or numbers, for example CSC.";
}

// Returns a clean { key: boolean } object, or null when the value is not acceptable.
export function cleanNotificationPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const clean = {};
  for (const [key, setting] of Object.entries(value)) {
    if (!NOTIFICATION_KEYS.includes(key) || typeof setting !== "boolean") return null;
    clean[key] = setting;
  }
  return clean;
}

// Keeps only the problems that have text, e.g. { email: "Enter a valid email address." }.
export function onlyProblems(checks) {
  return Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
}
