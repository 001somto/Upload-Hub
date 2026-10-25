# Auth API reference

Base URL (development): `http://localhost:4000`
All answers are JSON. Success: `{ "data": ... }`. Failure: `{ "error": { "code", "message", "fields?" } }`.
Protected routes need the header `Authorization: Bearer <token>`.

| Method | Path | Who | Body | Success |
|---|---|---|---|---|
| POST | /api/auth/register/user | public | name, email, password | 201 `{ token, user }` |
| POST | /api/auth/register/admin | public | name, email, password, departmentName, departmentCode | 201 `{ token, user }` (503 until the department service is connected) |
| POST | /api/auth/login | public | email, password, expectedRole? ("admin" or "user") | 200 `{ token, user }` |
| POST | /api/auth/forgot-password | public | email | 200 `{ message }` (same answer for any email) |
| POST | /api/auth/reset-password | public | token, password | 200 `{ message }` |
| GET | /api/users/me | signed in | - | 200 `{ user }` |
| PATCH | /api/users/me | signed in | name?, notificationPreferences?, profilePhotoKey? | 200 `{ user }` |
| POST | /api/users/me/password | signed in | currentPassword, newPassword | 200 `{ message, token }` (use the new token) |
| POST | /api/users/me/photo-upload-url | signed in | contentType, size | 501 until the S3 gateway is connected |
| GET | /api/health | public | - | 200 `{ status: "ok" }` |

## Rules
- Password: 8+ characters, at least one letter and one number, at most 72 bytes.
- Email is stored lower-case; one account per email.
- Department code: 2-10 letters/numbers, stored upper-case.
- Sessions last `SESSION_HOURS` (default 8). Changing or resetting a password signs out every other device.
- `expectedRole` mismatch is answered 403 `WRONG_ACCOUNT_TYPE`, but only after the password was correct.
- A paused account (status "disabled") can still sign in; it only loses department access (enforced by the teammate's code).
- PATCH /users/me answers 400 `FIELD_NOT_ALLOWED` for role, status, email, department, membership or password fields.
- Rate limits (per address, in memory): sign-in 20 / 15 min, sign-up 20 / hour, reset 10 / 15 min. Answer 429 `TOO_MANY_REQUESTS`.

## Error codes
VALIDATION_ERROR (400, with `fields`), FIELD_NOT_ALLOWED (400), INVALID_RESET_TOKEN (400), BAD_JSON (400), UNAUTHORIZED / SESSION_EXPIRED / INVALID_CREDENTIALS (401), WRONG_ACCOUNT_TYPE / FORBIDDEN (403), ROUTE_NOT_FOUND (404), EMAIL_TAKEN (409), TOO_MANY_REQUESTS (429), NOT_IMPLEMENTED (501), DEPARTMENT_SERVICE_NOT_CONNECTED (503), SERVER_ERROR (500).

## For the teammate
- Use `authenticate` (src/middleware/authenticate.js) on protected routes and `requireRole("admin")` for Admin-only ones. `req.user` is the full account loaded from the database on every request.
- Plug in your own pieces in `src/app.js` / `buildDependencies` overrides: `departments` (createDepartment), `storage` (photoUrl, createPhotoUpload), `email` (sendPasswordReset).
- You own account fields `departmentId` and `membershipState`: update them with `users.update(userId, {...})`.
