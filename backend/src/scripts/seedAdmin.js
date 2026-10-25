// scripts/seedAdmin.js
// WHAT THIS FILE IS: a DEVELOPMENT helper that creates one Admin account for you.
// WHY IT EXISTS: Admin sign-up needs the teammate's department code, which is not connected
// yet. This lets you sign in as an Admin and see the Admin side right away.
// WHAT IT DOES: reads SEED_ADMIN_* from .env and creates that Admin (no department attached).
// It refuses to run in production.

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { buildDependencies } from "../app.js";
import { loadConfig } from "../config/env.js";
import { checkEmail, checkPassword, defaultNotificationPreferences, normaliseEmail } from "../utils/validators.js";

const config = loadConfig();
if (config.production) {
  console.error("Refusing to seed an admin in production.");
  process.exit(1);
}
if (config.storageMode === "memory") {
  console.error("STORAGE_MODE=memory forgets everything when a script ends. Use dynamo mode for seeding.");
  process.exit(1);
}

const name = process.env.SEED_ADMIN_NAME || "Dev Admin";
const email = normaliseEmail(process.env.SEED_ADMIN_EMAIL || "");
const password = process.env.SEED_ADMIN_PASSWORD || "";
const problem = checkEmail(email) || checkPassword(password);
if (problem) {
  console.error(`Fix SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env: ${problem}`);
  process.exit(1);
}

const { users } = buildDependencies(config);
try {
  await users.create({
    userId: crypto.randomUUID(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString(),
    departmentId: null,
    membershipState: "active",
    profilePhotoKey: null,
    notificationPreferences: defaultNotificationPreferences(),
    tokenVersion: 0,
  });
  console.log(`Created admin ${email}. Sign in at /signin/admin with the password from .env.`);
} catch (error) {
  console.error(error.code === "EMAIL_TAKEN" ? `An account for ${email} already exists.` : `Failed: ${error.message}`);
  process.exit(1);
}
