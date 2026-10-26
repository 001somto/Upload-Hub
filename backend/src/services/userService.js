// services/userService.js
// WHAT THIS FILE IS: the rules for a signed-in person's own profile.
// WHAT IT DOES: read the profile, change allowed profile fields, change the password.
// Role, status, department, membership and email can NEVER be changed from here.

import bcrypt from "bcryptjs";
import { badRequest, unauthorized } from "../utils/errors.js";
import { checkName, checkPassword, cleanNotificationPreferences, onlyProblems } from "../utils/validators.js";
import { toPublicUser } from "./userShape.js";

const ALLOWED_PROFILE_FIELDS = ["name", "notificationPreferences", "profilePhotoKey"];

export function createUserService({ users, tokens, storage, notificationService, auditService }) {
  return {
    publicUser: (user) => toPublicUser(user, storage),

    async updateProfile(user, body) {
      if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("Send the fields you want to change.");
      const keys = Object.keys(body);
      if (keys.length === 0) throw badRequest("Send the fields you want to change.");
      const forbidden = keys.filter((key) => !ALLOWED_PROFILE_FIELDS.includes(key));
      if (forbidden.length) {
        throw badRequest(`You cannot change: ${forbidden.join(", ")}.`, Object.fromEntries(forbidden.map((key) => [key, "This cannot be changed here."])), "FIELD_NOT_ALLOWED");
      }

      const changes = {};
      const problems = {};
      if ("name" in body) {
        problems.name = checkName(body.name);
        if (!problems.name) changes.name = body.name.trim();
      }
      if ("notificationPreferences" in body) {
        const clean = cleanNotificationPreferences(body.notificationPreferences);
        if (!clean) problems.notificationPreferences = "Those notification choices are not valid.";
        else changes.notificationPreferences = { ...user.notificationPreferences, ...clean };
      }
      if ("profilePhotoKey" in body) {
        const key = body.profilePhotoKey;
        // A photo may only point at the signed-in person's own folder.
        const ok = key === null || (typeof key === "string" && key.length <= 300 && key.startsWith(`profile-photos/${user.userId}/`) && !key.includes(".."));
        if (!ok) problems.profilePhotoKey = "That photo is not valid.";
        else changes.profilePhotoKey = key;
      }
      const real = onlyProblems(problems);
      if (Object.keys(real).length) throw badRequest("Please fix the highlighted fields.", real);

      const updated = await users.update(user.userId, changes);

      if (notificationService) {
        if ("profilePhotoKey" in changes) {
          notificationService.send({ userId: user.userId, type: "account", message: "Your profile photo was updated successfully." });
        }
        if ("name" in changes) {
          notificationService.send({ userId: user.userId, type: "account", message: "Your full name was updated." });
        }
        if ("notificationPreferences" in changes) {
          notificationService.send({ userId: user.userId, type: "account", message: "Your notification preferences have been saved." });
        }
      }

      return toPublicUser(updated, storage);
    },

    async changePassword(user, { currentPassword, newPassword }) {
      if (typeof currentPassword !== "string" || !currentPassword) throw badRequest("Please fix the highlighted fields.", { currentPassword: "Enter your current password." });
      const problem = checkPassword(newPassword);
      if (problem) throw badRequest("Please fix the highlighted fields.", { newPassword: problem });
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw badRequest("Please fix the highlighted fields.", { currentPassword: "That is not your current password." });
      }
      if (currentPassword === newPassword) throw badRequest("Please fix the highlighted fields.", { newPassword: "Choose a password different from the current one." });

      const updated = await users.update(user.userId, {
        passwordHash: await bcrypt.hash(newPassword, 12),
        tokenVersion: (user.tokenVersion || 0) + 1, // signs out other devices
      });

      if (notificationService) {
        notificationService.send({ userId: user.userId, type: "security", message: "Your account password was successfully changed." });
      }
      if (auditService) {
        auditService.record({ userId: user.userId, userName: user.name, userRole: user.role, action: "auth.passwordChanged", target: "Account password" });
      }

      return { message: "Your password has been changed.", token: tokens.sign(updated) };
    },
  };
}
