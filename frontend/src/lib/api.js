// lib/api.js
// WHAT THIS FILE IS: the ONE file that talks to the backend. Every screen gets its data
// by calling a function from the `api` object at the bottom of this file.
// WHAT IT DOES: sends requests (with the login token), turns the answers into plain
// data, and turns failures into a clear ApiError the screens can show.
//
// HOW TO CHANGE THE BACKEND CONTRACT: when your teammate's real endpoints are ready, edit
// ONLY the paths and shapes in this file. The screens do not need to change.
//
// STATUS OF EACH GROUP:
//   CONNECTED   = already built in the "backend" folder (auth and profile).
//   PROVISIONAL = the endpoint is only a proposal. Your teammate's backend has to provide
//                 it (or you agree a different name and edit it here). Until then the
//                 screens show a "Not connected yet" message. No sample data is used.
//
// THE ANSWER FORMAT EVERY ENDPOINT USES:
//   success: { "data": ... }                               (this file returns just `data`)
//   failure: { "error": { "code": "SOME_CODE", "message": "Readable text", "fields": { "email": "..." } } }
// A missing ROUTE answers with code "ROUTE_NOT_FOUND" (screens show "Not connected yet").
// A missing THING (e.g. a deleted file) answers 404 with code "NOT_FOUND" (screens show an error).

import { settings } from "../config/settings";
import { getToken } from "./session";

// ---------------------------------------------------------------------------
// ERRORS
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor({ status = 0, code = "UNKNOWN_ERROR", message = "Something went wrong.", fields = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status; // HTTP status, or 0 when the server could not be reached
    this.code = code; // short machine-readable code, e.g. "INVALID_CREDENTIALS"
    this.fields = fields; // field-by-field messages for forms, e.g. { email: "Already used" }
  }
}

// Codes that mean "this endpoint does not exist yet" rather than "something broke".
const NOT_CONNECTED_CODES = ["ROUTE_NOT_FOUND", "NOT_IMPLEMENTED", "DEPARTMENT_SERVICE_NOT_CONNECTED"];

export function isNotConnected(error) {
  return error instanceof ApiError && (NOT_CONNECTED_CODES.includes(error.code) || error.status === 501);
}

export function isNetworkError(error) {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}

// A plain-language message for when the server sent no message of its own.
function fallbackMessage(status) {
  if (status === 400) return "Please check the details and try again.";
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That could not be found.";
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "The server had a problem. Try again in a moment.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// SESSION EXPIRY HOOK
// AuthContext registers a function here. When a signed-in request is refused with 401,
// that function signs the person out and sends them to the sign-in page.
// ---------------------------------------------------------------------------

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// ---------------------------------------------------------------------------
// THE REQUEST FUNCTION (everything below uses this)
// ---------------------------------------------------------------------------

function buildUrl(path, query) {
  const base = `${settings.apiBaseUrl}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const text = params.toString();
  return text ? `${base}?${text}` : base;
}

// auth: true      -> send the token; a 401 answer signs the person out
// auth: false     -> never send the token (sign-in, sign-up, password reset)
// auth: "optional"-> send the token if there is one, but never sign out on a 401 (public share pages)
async function request(method, path, { body, query, auth = true, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = auth === false ? null : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    console.error("[api request error]", method, path, error);
    if (error && error.name === "AbortError") throw error;
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Cannot reach the server. Check your connection, and that the backend is running.",
    });
  }

  // Read the answer as text first, because some failures (like a plain 404 page) are not JSON.
  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (response.ok) {
    return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
  }

  const info = (payload && payload.error) || {};
  const apiError = new ApiError({
    status: response.status,
    code: info.code || (response.status === 404 ? "ROUTE_NOT_FOUND" : "HTTP_ERROR"),
    message: info.message || fallbackMessage(response.status),
    fields: info.fields || null,
  });

  if (response.status === 401 && auth === true && token && unauthorizedHandler) {
    unauthorizedHandler(apiError);
  }
  throw apiError;
}

// ---------------------------------------------------------------------------
// UPLOADING A FILE STRAIGHT TO S3
// The backend hands out a short-lived "presigned URL". The browser sends the file there
// directly (not through the backend). XMLHttpRequest is used because it reports progress.
// ---------------------------------------------------------------------------

export function uploadToSignedUrl(uploadUrl, file, { headers = {}, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    if (!headers["Content-Type"] && file.type) xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError({ status: xhr.status, code: "UPLOAD_FAILED", message: "The file could not be uploaded. Try again." }));
    };
    xhr.onerror = () =>
      reject(new ApiError({ code: "NETWORK_ERROR", message: "The upload was interrupted. Check your connection and try again." }));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

// ---------------------------------------------------------------------------
// THE ENDPOINTS
// ---------------------------------------------------------------------------
//
// Shapes used below (all dates are ISO strings, all sizes are bytes):
//   User     { userId, name, email, role: "admin"|"user", status: "active"|"disabled", createdAt,
//              departmentId|null, membershipState: "independent"|"pending"|"active"|"rejected"|"removed",
//              profilePhotoUrl|null, notificationPreferences: { ... } }
//   Folder   { folderId, name, parentFolderId|null, createdAt, itemCount? }
//   File     { fileId, name, size, contentType, uploadedAt, ownerId, ownerName, folderId|null }
//   Permissions (booleans for the signed-in person in that space)
//            { upload, download, share, createFolders, manageFiles }

export const api = {
  // ===== CONNECTED: accounts and profile (built in backend/) =====
  auth: {
    // body { name, email, password, departmentName, departmentCode } -> { token, user }
    // Answers 503 "DEPARTMENT_SERVICE_NOT_CONNECTED" until the teammate's department code exists.
    registerAdmin: (body) => request("POST", "/api/auth/register/admin", { body, auth: false }),
    // body { name, email, password } -> { token, user }
    registerUser: (body) => request("POST", "/api/auth/register/user", { body, auth: false }),
    // body { email, password, expectedRole?: "admin"|"user" } -> { token, user }
    // Answers 403 "WRONG_ACCOUNT_TYPE" when expectedRole does not match (and signs nobody in).
    login: (body) => request("POST", "/api/auth/login", { body, auth: false }),
    // body { email } -> { message }   (the same answer whether or not the email exists)
    forgotPassword: (body) => request("POST", "/api/auth/forgot-password", { body, auth: false }),
    // body { token, password } -> { message }
    resetPassword: (body) => request("POST", "/api/auth/reset-password", { body, auth: false }),
  },
  users: {
    // -> { user }
    me: () => request("GET", "/api/users/me"),
    // body { name?, notificationPreferences?, profilePhotoKey? } -> { user }
    updateMe: (body) => request("PATCH", "/api/users/me", { body }),
    // body { currentPassword, newPassword } -> { message }
    changePassword: (body) => request("POST", "/api/users/me/password", { body }),
    // PROVISIONAL (needs the teammate's S3 helper). body { contentType, size } -> { uploadUrl, photoKey, headers? }
    photoUploadUrl: (body) => request("POST", "/api/users/me/photo-upload-url", { body }),
  },

  // ===== PROVISIONAL: storage numbers =====
  storage: {
    // -> { usedBytes, limitBytes, remainingBytes, fileCount,
    //      recentUploads: File[], byType: [{ type: "Documents", bytes }] }
    me: () => request("GET", "/api/storage/me"),
    // Admin only. days is 7, 30 or 90.
    // -> { usedBytes, limitBytes, remainingBytes, activeMembers, recentUploads: File[],
    //      byMember: [{ userId, name, bytes }], trend: [{ date, usedBytes }] }
    department: (days = 30) => request("GET", "/api/storage/department", { query: { days } }),
  },

  // ===== PROVISIONAL: files and folders =====
  // scope is "independent" (your own workspace) or "department" (department resources).
  files: {
    // params { scope, folderId, q, sort: "name"|"date"|"size", order: "asc"|"desc" }
    // -> { folder: Folder|null, breadcrumbs: [{ folderId, name }], folders: Folder[], files: File[],
    //      permissions: Permissions }
    // A non-member asking for scope "department" is answered 403 "NOT_A_MEMBER".
    list: (params) => request("GET", "/api/files", { query: params }),
    // body { name, parentFolderId|null, scope } -> { folder }
    createFolder: (body) => request("POST", "/api/folders", { body }),
    // body { name } -> { file }
    renameFile: (fileId, body) => request("PATCH", `/api/files/${encodeURIComponent(fileId)}`, { body }),
    // body { name } -> { folder }
    renameFolder: (folderId, body) => request("PATCH", `/api/folders/${encodeURIComponent(folderId)}`, { body }),
    // body { fileIds: [], folderIds: [], targetFolderId|null } -> { moved: number }
    move: (body) => request("POST", "/api/items/move", { body }),
    // Permanent delete. body { fileIds: [], folderIds: [] } -> { deleted: number }
    remove: (body) => request("POST", "/api/items/delete", { body }),
    // Step 1 of an upload. body { name, size, contentType, folderId|null, scope }
    // -> { uploadId, uploadUrl, headers? }
    // Refusals the screens understand: "QUOTA_EXCEEDED", "FILE_TOO_LARGE", "TYPE_NOT_ALLOWED", "PERMISSION_DENIED".
    // If a file with that name already exists in the folder, the backend keeps both and
    // renames the new one, e.g. "report (1).pdf".
    uploadUrl: (body) => request("POST", "/api/files/upload-url", { body }),
    // Step 3 of an upload (step 2 is uploadToSignedUrl). body { uploadId } -> { file }
    confirmUpload: (body) => request("POST", "/api/files/confirm-upload", { body }),
    // -> { url, expiresAt }   a short-lived link that downloads the file
    downloadUrl: (fileId) => request("GET", `/api/files/${encodeURIComponent(fileId)}/download-url`),
    // -> { url, expiresAt, contentType }   a short-lived link that opens an image or PDF inline
    previewUrl: (fileId) => request("GET", `/api/files/${encodeURIComponent(fileId)}/preview-url`),
  },

  // ===== PROVISIONAL: share links =====
  shares: {
    // -> { items: [{ linkId, targetType: "file"|"folder", targetId, targetName, url, createdAt,
    //                expiresAt, status: "active"|"expired"|"revoked" }] }
    list: () => request("GET", "/api/share-links"),
    // body { targetType, targetId, expiresInDays?: 1|7|30, expiresAt?: ISO } -> { link }
    create: (body) => request("POST", "/api/share-links", { body }),
    // -> { link }
    revoke: (linkId) => request("POST", `/api/share-links/${encodeURIComponent(linkId)}/revoke`),
    // Public page. Checks the link again every time it is opened.
    // -> { state: "active"|"expired"|"revoked"|"requiresSignIn"|"notFound",
    //      targetType, name, contentType, size, downloadUrl? }
    // A folder link answers state "requiresSignIn" to anyone who is not signed in.
    open: (linkId) => request("GET", `/api/share/${encodeURIComponent(linkId)}`, { auth: "optional" }),
  },

  // ===== PROVISIONAL: departments and my membership (User side) =====
  departments: {
    // -> { items: [{ departmentId, name, code, adminName }] }   (hidden departments never appear)
    search: (q) => request("GET", "/api/departments", { query: { q } }),
    // -> { state, department: { departmentId, name, code, adminName }|null, requestedAt|null,
    //      decidedAt|null, permissions: ["download", ...] }
    membership: () => request("GET", "/api/membership/me"),
    // body { departmentId } or { code } -> same shape as membership()
    requestToJoin: (body) => request("POST", "/api/membership/requests", { body }),
    // -> same shape as membership()
    cancelRequest: () => request("POST", "/api/membership/me/cancel"),
    // -> same shape as membership()
    leave: () => request("POST", "/api/membership/me/leave"),
  },

  // ===== PROVISIONAL: department management (Admin side) =====
  department: {
    // params { q, status: "active"|"disabled", page, pageSize }
    // -> { items: [{ userId, name, email, role, createdAt, status, membershipState, permissions: [] }],
    //      page, pageSize, total }
    members: (params) => request("GET", "/api/department/members", { query: params }),
    // -> { items: [{ requestId, userId, name, email, requestedAt }] }
    requests: () => request("GET", "/api/department/requests"),
    // decision is "approve" or "reject". -> { ok: true }
    decideRequest: (requestId, decision) =>
      request("POST", `/api/department/requests/${encodeURIComponent(requestId)}/${decision}`),
    // Ends the person's membership. -> { ok: true }
    removeMember: (userId) => request("POST", `/api/department/members/${encodeURIComponent(userId)}/remove`),
    // Pauses (disable) or restores (enable) department access only. -> { ok: true }
    setMemberStatus: (userId, status) =>
      request("POST", `/api/department/members/${encodeURIComponent(userId)}/${status === "disabled" ? "disable" : "enable"}`),
    // body { permissions: ["download", "upload", ...] } -> { ok: true }
    setPermissions: (userId, body) =>
      request("PUT", `/api/department/members/${encodeURIComponent(userId)}/permissions`, { body }),
    // body { userIds: [], permissions: [] } -> { updated: number }
    bulkPermissions: (body) => request("POST", "/api/department/members/permissions/bulk", { body }),
    // -> { name, code, visibleInDirectory }
    settings: () => request("GET", "/api/department/settings"),
    // body { visibleInDirectory } -> { name, code, visibleInDirectory }
    updateSettings: (body) => request("PATCH", "/api/department/settings", { body }),
  },

  // ===== PROVISIONAL: audit trail and notifications =====
  audit: {
    // Admin only, limited to the Admin's own department.
    // params { userId, action, from, to, page, pageSize }
    // -> { items: [{ logId, userId, userName, action, target, timestamp }], page, pageSize, total }
    list: (params) => request("GET", "/api/audit", { query: params }),
    // The signed-in person's own events only. params { page, pageSize } -> same shape as list
    mine: (params) => request("GET", "/api/activity/me", { query: params }),
  },
  notifications: {
    // -> { items: [{ notificationId, type, message, timestamp, read }], unreadCount }
    list: () => request("GET", "/api/notifications"),
    // body { ids: [] } or { all: true } -> { unreadCount }
    markRead: (body) => request("POST", "/api/notifications/read", { body }),
  },
};
