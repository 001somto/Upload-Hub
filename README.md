# UploadHub

Department file management for the University of Nigeria, Nsukka.
This zip has two folders:

- `frontend/` - the whole website (React + Vite + Tailwind CSS). **Complete.**
- `backend/`  - the accounts part of the server (Node + Express + DynamoDB). **Sign-up, sign-in, profile, password reset.** Everything else belongs to the backend teammate.

Nothing in the website is mock data. Screens whose server part does not exist yet say **"Not connected yet"** instead of showing made-up content.

## 1. Run it on your computer (VS Code)

You need Node.js 20 or newer. For the database in development you need DynamoDB Local (Docker is easiest).

```bash
# Terminal 1 - database (DynamoDB Local)
docker run -p 8000:8000 amazon/dynamodb-local

# Terminal 2 - backend
cd backend
npm install
cp .env.example .env          # then open .env and set JWT_SECRET to a long random value
npm run setup-tables          # creates the tables (once)
npm run seed-admin            # optional: makes a dev Admin from SEED_ADMIN_* in .env
npm run dev                   # http://localhost:4000

# Terminal 3 - website
cd frontend
npm install
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:4000
npm run dev                   # http://localhost:5173
```

No Docker? Set `STORAGE_MODE=memory` in `backend/.env` to try things quickly (accounts vanish when the server stops).

Run the backend tests: `cd backend && npm test`.

## 2. What you can do right now

| Area | Works? |
|---|---|
| Landing page, About, Help, Privacy, Contact, 404 | Yes |
| User sign-up / sign-in, sign out, session expiry, forgot + reset password | Yes (needs backend running) |
| User area (dashboard, settings, change name/password, notification choices) | Yes |
| Admin sign-in | Yes, via `npm run seed-admin` (see below) |
| Admin sign-up | Stops with a clear message: needs the department service (teammate) |
| Files, folders, uploads, sharing, departments, members, requests, analytics, audit, notifications, profile photo | Screens are built and wait for the teammate's endpoints ("Not connected yet") |

**Admin side:** Admin sign-up creates a department, which is the teammate's code. Until it exists, use `npm run seed-admin` to create an Admin and sign in at `/signin/admin`. That Admin has no department, so department screens show "Not connected yet".

**Password reset in development:** the reset link is printed in the backend terminal (`EMAIL_MODE=console`). Real email (AWS SES) is not set up.

## 3. For the backend teammate

1. Read `backend/docs/AUTH_API.md` (what exists) and the project plan document.
2. **All website-to-server calls are in one file: `frontend/src/lib/api.js`.** Groups marked CONNECTED are built; groups marked PROVISIONAL describe what the screens expect (paths, bodies, answers). Change that file if your endpoints differ - screens do not need to change.
3. Mount your routers in `backend/src/app.js` (marked spot) using `authenticate` and `requireRole("admin")`.
4. Plug in: `departments` gateway (needed for Admin sign-up), `storage` gateway (profile photos), `email` gateway (SES).
5. You own `departmentId` and `membershipState` on the user record (`users.update`).
6. Final DynamoDB design, S3, quotas, deployment (S3 + CloudFront, EC2 in a VPC) are yours. The auth table layout is in `src/repositories/dynamoRepositories.js`.

## 4. Known limits and decisions to review

- The sign-in token is kept in the browser's localStorage (simple, but readable by any script on the page). Moving it to an httpOnly cookie only touches `lib/session.js`, `lib/api.js` and the backend login.
- Rate limiting is in memory (one server). Use a shared limiter when there are several servers.
- The Privacy page is starter text and the Contact page has a placeholder email: replace both (`src/config/settings.js`, `src/pages/public/StaticPages.jsx`).
- Browsers need HTTPS in production: put the site behind CloudFront.
- Storage limits (User 1 GB, Admin 5 GB, department separate) are decided by the backend, not the website.

## 5. What was and was not verified when this was built

Verified in the build environment: every frontend file compiles and every import resolves; the stylesheet compiles with all theme classes found; all public, User and Admin screens render at phone and desktop widths with no script errors or sideways scrolling (with the server answering "not found", so the "Not connected yet" states were checked); backend auth logic passes 28 automated tests (using stand-ins for the password and token packages).

**Not verified** (this environment could not install packages or reach AWS): `npm install`, `vite build`, the real Express server (an HTTP test is included and runs after `npm install`), real bcryptjs/jsonwebtoken, DynamoDB (Local or AWS), any email, any upload, and every PROVISIONAL screen against a real backend. Run `npm test` and click through once after installing; report anything that differs.
