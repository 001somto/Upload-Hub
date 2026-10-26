// pages/shared/SettingsPage.jsx
// WHAT THIS FILE IS: the Settings screen, used by both Users and Admins.
// WHAT IT DOES: four cards:
//   1. Profile        - change your full name and profile photo; see your read-only details
//   2. Password       - change your password (the backend checks the current one)
//   3. Notifications  - choose which notifications you want
//   4. Department     - Admins only: show or hide the department in the public directory
// Role, status, department and permissions are shown but can NEVER be edited here: only
// the backend changes those, and it refuses attempts to change them through this screen.
// STATUS: profile and password are CONNECTED to the backend. Photo upload and department
// settings are PROVISIONAL (they need the backend teammate's S3 helper and department code).

import { useRef, useState } from "react";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataBoundary from "../../components/ui/DataBoundary";
import { PasswordField, SwitchField, TextField } from "../../components/ui/Fields";
import { InlineAlert } from "../../components/ui/Feedback";
import PageHeader from "../../components/ui/PageHeader";
import { MEMBERSHIP_STATES } from "../../config/settings";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApiData from "../../hooks/useApiData";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ApiError, api, isNotConnected, uploadToSignedUrl } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { saveSession } from "../../lib/session";
import { Pencil } from "../../lib/icons";
import { PASSWORD_HINT, validateConfirm, validateName, validatePassword } from "../../lib/validation";

// The notification choices. KEEP THESE KEYS THE SAME as backend/src/utils/validators.js.
const NOTIFICATION_CHOICES = [
  { key: "uploadConfirmations", label: "Upload confirmations", description: "Tell me when an upload finishes." },
  { key: "shareLinkExpiry", label: "Share link reminders", description: "Warn me before one of my links expires. This one can be sent by email." },
  { key: "membershipUpdates", label: "Membership updates", description: "Tell me when a join request is decided or my access changes. This one can be sent by email." },
  { key: "securityAlerts", label: "Security alerts", description: "Tell me about password changes and new sign-ins." },
];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

function errorText(error) {
  if (isNotConnected(error)) return "This is not connected to the server yet.";
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

// ---------- 1. PROFILE ----------
function ProfileCard() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInput = useRef(null);
  const membership = MEMBERSHIP_STATES[user.membershipState] || MEMBERSHIP_STATES.independent;

  async function saveName(event) {
    event.preventDefault();
    const problem = validateName(name);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const data = await api.users.updateMe({ name: name.trim() });
      setUser(data.user);
      toast({ title: "Saved", message: "Your name was updated." });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function choosePhoto(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      toast({ title: "Use a PNG, JPG or WebP image", tone: "error" });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast({ title: "That image is too large", message: "Choose one under 5 MB.", tone: "error" });
      return;
    }
    setPhotoBusy(true);
    try {
      const slot = await api.users.photoUploadUrl({ contentType: file.type, size: file.size });
      await uploadToSignedUrl(slot.uploadUrl, file, { headers: slot.headers || {} });
      const data = await api.users.updateMe({ profilePhotoKey: slot.photoKey });
      setUser(data.user);
      toast({ title: "Photo updated" });
    } catch (caught) {
      toast({
        title: "Could not update your photo",
        message: isNotConnected(caught) ? "Photo upload is not connected to the server yet." : errorText(caught),
        tone: "error",
      });
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profile" description="How you appear to others in UploadHub." />
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-3">
          <Avatar name={user.name} src={user.profilePhotoUrl} className="h-24 w-24 text-3xl" />
          <input ref={fileInput} type="file" accept={PHOTO_TYPES.join(",")} className="sr-only" aria-label="Choose a profile photo" onChange={choosePhoto} />
          <Button variant="secondary" size="sm" icon={Pencil} loading={photoBusy} onClick={() => fileInput.current && fileInput.current.click()}>
            Change photo
          </Button>
        </div>
        <form onSubmit={saveName} noValidate className="min-w-0 flex-1 space-y-4">
          <TextField label="Full name" value={name} onChange={(event) => setName(event.target.value)} error={error} autoComplete="name" />
          <Button type="submit" loading={busy} disabled={name.trim() === user.name}>
            Save name
          </Button>
        </form>
      </div>

      <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="mt-0.5 break-all font-semibold text-ink">{user.email}</dd>
        </div>
        <div>
          <dt className="text-muted">Account type</dt>
          <dd className="mt-0.5 font-semibold text-ink">{user.role === "admin" ? "Admin" : "User"}</dd>
        </div>
        <div>
          <dt className="text-muted">Account status</dt>
          <dd className="mt-0.5">
            <Badge tone={user.status === "active" ? "green" : "amber"}>{user.status === "active" ? "Active" : "Department access paused"}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Member since</dt>
          <dd className="mt-0.5 font-semibold text-ink">{formatDate(user.createdAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Department</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
            <Badge tone={membership.tone}>{membership.label}</Badge>
            <span className="text-muted">{user.role === "admin" ? "You are an admin of this department." : membership.help}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted">Your email, account type, status and department can only be changed by the system, not from this page.</p>
    </Card>
  );
}

// ---------- 2. PASSWORD ----------
function PasswordCard() {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    const next = {
      current: form.current ? "" : "Enter your current password.",
      next: validatePassword(form.next),
      confirm: validateConfirm(form.next, form.confirm),
    };
    setErrors(next);
    if (next.current || next.next || next.confirm) return;
    setBusy(true);
    try {
      // Changing the password signs out other devices, so the server sends a fresh token for this one.
      const data = await api.users.changePassword({ currentPassword: form.current, newPassword: form.next });
      if (data && data.token) saveSession(data.token);
      setForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed" });
    } catch (caught) {
      const fields = caught instanceof ApiError && caught.fields ? caught.fields : null;
      setErrors(fields ? { current: fields.currentPassword, next: fields.newPassword } : { current: errorText(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Password" description="Choose a password you do not use anywhere else." />
      <form onSubmit={submit} noValidate className="max-w-md space-y-4">
        <PasswordField label="Current password" autoComplete="current-password" value={form.current} onChange={update("current")} error={errors.current} />
        <PasswordField label="New password" autoComplete="new-password" value={form.next} onChange={update("next")} error={errors.next} hint={errors.next ? undefined : PASSWORD_HINT} />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} error={errors.confirm} />
        <Button type="submit" loading={busy}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

// ---------- 3. NOTIFICATIONS ----------
function NotificationCard() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(user.notificationPreferences || {});
  const [busyKey, setBusyKey] = useState("");

  async function toggle(key, value) {
    const before = prefs;
    const after = { ...prefs, [key]: value };
    setPrefs(after); // show the change straight away
    setBusyKey(key);
    try {
      const data = await api.users.updateMe({ notificationPreferences: after });
      setUser(data.user);
    } catch (caught) {
      setPrefs(before); // put it back if the server refused
      toast({ title: "Could not save that", message: errorText(caught), tone: "error" });
    } finally {
      setBusyKey("");
    }
  }

  return (
    <Card>
      <CardHeader title="Notifications" description="Choose what you hear about. Everything shows in the app; some can also be emailed once email sending is set up." />
      <div className="space-y-5">
        {NOTIFICATION_CHOICES.map((choice) => (
          <SwitchField
            key={choice.key}
            label={choice.label}
            description={choice.description}
            checked={prefs[choice.key] !== false}
            disabled={busyKey === choice.key}
            onChange={(value) => toggle(choice.key, value)}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------- 4. DEPARTMENT (Admins only) ----------
function DepartmentCard() {
  const { toast } = useToast();
  const result = useApiData(() => api.department.settings(), []);
  const [busy, setBusy] = useState(false);

  async function setVisible(value) {
    setBusy(true);
    try {
      const data = await api.department.updateSettings({ visibleInDirectory: value });
      result.setData(data);
      toast({ title: value ? "Department is now listed" : "Department is now hidden" });
    } catch (caught) {
      toast({ title: "Could not save that", message: errorText(caught), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Department" description="Settings for the department you manage." />
      <DataBoundary result={result} feature="Department settings" rows={2}>
        {(data) => (
          <div className="space-y-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="mt-0.5 font-semibold text-ink">{data.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Code</dt>
                <dd className="mt-0.5 font-semibold tracking-wider text-ink">{data.code}</dd>
              </div>
            </dl>
            <SwitchField
              label="Show in the department directory"
              description="When off, people cannot find your department by searching. They can still join if you give them the code."
              checked={Boolean(data.visibleInDirectory)}
              disabled={busy}
              onChange={setVisible}
            />
          </div>
        )}
      </DataBoundary>
    </Card>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Settings" description="Your profile, password and notification choices." />
      <div className="space-y-6">
        <ProfileCard />
        <PasswordCard />
        <NotificationCard />
        {user.role === "admin" ? <DepartmentCard /> : null}
        {user.role === "admin" && !user.departmentId ? (
          <InlineAlert tone="info" title="No department attached">
            This Admin account is not linked to a department yet, so department settings and analytics cannot load.
          </InlineAlert>
        ) : null}
      </div>
    </div>
  );
}
