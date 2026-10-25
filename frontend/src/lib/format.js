// lib/format.js
// WHAT THIS FILE IS: small helpers that turn raw values into readable text.
// WHAT IT DOES: formats file sizes ("1.4 GB"), dates and times in Nigeria time
// ("24 Oct 2026, 10:42"), countdowns ("in 3 days") and name initials for avatars.

import { settings } from "../config/settings";

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];

// 1536 -> "1.5 KB". Returns a dash when the value is missing.
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return "-";
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${SIZE_UNITS[unit]}`;
}

// Works out how full something is, as a number from 0 to 100.
export function percentUsed(used, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

// Picks out one part (day, month...) of a date, in Nigeria time.
function dateParts(value, options) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: settings.timeZone, ...options }).formatToParts(date);
  const result = {};
  for (const part of parts) result[part.type] = part.value;
  return result;
}

// "24 Oct 2026"
export function formatDate(value) {
  const p = dateParts(value, { day: "numeric", month: "short", year: "numeric" });
  return p ? `${p.day} ${p.month} ${p.year}` : "-";
}

// "24 Oct 2026, 10:42" (24-hour clock)
export function formatDateTime(value) {
  const p = dateParts(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return p ? `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}` : "-";
}

// "in 3 days", "in 5 hours", "in 12 minutes" or "expired".
export function timeUntil(value, now = Date.now()) {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "-";
  const diff = target - now;
  if (diff <= 0) return "expired";
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${Math.max(1, minutes)} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}

// "Chidinma Okafor" -> "CO"
export function initials(name) {
  if (!name) return "?";
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "");
  return letters.join("") || "?";
}

// Groups a file's content type into a friendly label for the storage breakdown.
export function fileKind(contentType = "") {
  if (contentType.startsWith("image/")) return "Images";
  if (contentType === "application/pdf") return "PDFs";
  if (contentType.startsWith("video/")) return "Videos";
  if (contentType.includes("word") || contentType.includes("text") || contentType.includes("sheet") || contentType.includes("presentation")) return "Documents";
  return "Other";
}
