// lib/audit.js
// WHAT THIS FILE IS: the readable names for the events the audit trail records.
// WHAT IT DOES: turns an event code like "file.uploaded" into "File uploaded", and gives
// the filter drop-down on the Audit trail page its list. The codes are PROVISIONAL:
// agree the final list with the backend teammate and edit it here.

export const AUDIT_ACTIONS = [
  { key: "account.created", label: "Account created" },
  { key: "auth.login", label: "Signed in" },
  { key: "auth.passwordChanged", label: "Password changed" },
  { key: "file.uploaded", label: "File uploaded" },
  { key: "file.downloaded", label: "File downloaded" },
  { key: "file.deleted", label: "File deleted" },
  { key: "file.renamed", label: "File renamed" },
  { key: "file.moved", label: "File moved" },
  { key: "folder.created", label: "Folder created" },
  { key: "folder.renamed", label: "Folder renamed" },
  { key: "folder.deleted", label: "Folder deleted" },
  { key: "permission.changed", label: "Permissions changed" },
  { key: "membership.requested", label: "Join request sent" },
  { key: "membership.approved", label: "Join request approved" },
  { key: "membership.rejected", label: "Join request rejected" },
  { key: "membership.removed", label: "Member removed" },
  { key: "membership.left", label: "Member left" },
  { key: "share.created", label: "Share link created" },
  { key: "share.revoked", label: "Share link revoked" },
];

export function describeAction(action) {
  const found = AUDIT_ACTIONS.find((item) => item.key === action);
  return found ? found.label : action;
}
