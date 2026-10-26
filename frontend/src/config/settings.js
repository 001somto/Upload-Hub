// config/settings.js
// WHAT THIS FILE IS: the one place for settings you may want to change later.
// WHAT IT DOES: holds the backend address, the time zone, a few labels and the lists of
// permissions and membership states that several screens share. Quotas (1 GB, 5 GB, the
// department limit) are NOT here on purpose: the backend decides them and the screens
// only show whatever the backend sends.

export const settings = {
  appName: "UploadHub",
  institution: "University of Nigeria, Nsukka",

  // Where the backend API lives. Set VITE_API_BASE_URL in frontend/.env to change it.
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, ""),

  // All dates and times are shown in Nigeria time, 24-hour, e.g. "24 Oct 2026, 10:42".
  timeZone: "Africa/Lagos",

  // How long a login lasts. The backend sets the real value; this is only used for wording.
  sessionHours: 8,

  // How long an idle session lasts before automatically signing out (in minutes).
  inactivityMinutes: Number(import.meta.env.VITE_INACTIVITY_MINUTES ?? 15),

  // PLACEHOLDER: replace with the real support address before launch.
  contactEmail: "support@uploadhub.example",
};

// The five permissions an Admin can give a department member. "download" is on by default.
export const PERMISSIONS = [
  { key: "download", label: "Download files", description: "Open and download department files." },
  { key: "upload", label: "Upload files", description: "Add files to department storage." },
  { key: "createFolders", label: "Create folders", description: "Create folders in department storage." },
  { key: "share", label: "Share links", description: "Create share links for department files." },
  { key: "manageFiles", label: "Manage files", description: "Rename, move and delete department files." },
];

// The five membership states, with the wording and badge colour each one uses.
export const MEMBERSHIP_STATES = {
  independent: { label: "Independent", tone: "neutral", help: "You are not part of a department." },
  pending: { label: "Pending", tone: "amber", help: "Waiting for the department Admin to approve." },
  active: { label: "Active", tone: "green", help: "You are a member of this department." },
  rejected: { label: "Rejected", tone: "red", help: "The Admin declined your request. You can request again." },
  removed: { label: "Removed", tone: "red", help: "Your department access ended. You can request again." },
};

// File types the browser can open in a preview instead of downloading.
export const PREVIEWABLE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];
