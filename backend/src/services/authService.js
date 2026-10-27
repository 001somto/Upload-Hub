// services/authService.js
// WHAT THIS FILE IS: the rules for creating accounts and signing in.
// WHAT IT DOES: register a User, register an Admin (with their department), log in, and the
// forgot / reset password steps. Controllers call these functions; this file talks to the
// database through "repositories" and to other parts through "gateways".

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { AppError, badRequest, forbidden, unauthorized } from "../utils/errors.js";
import {
  checkDepartmentCode,
  checkDepartmentName,
  checkEmail,
  checkName,
  checkPassword,
  defaultNotificationPreferences,
  normaliseDepartmentCode,
  normaliseEmail,
  onlyProblems,
} from "../utils/validators.js";
import { toPublicUser } from "./userShape.js";

const BCRYPT_ROUNDS = 12;
const RESET_MINUTES = 30;
const BAD_LOGIN = "Incorrect email or password.";
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

export function createAuthService({ users, resets, departments, email, tokens, storage, config, snsService }) {
  // A pretend hash, so a login for an unknown email takes as long as a real one.
  // That stops attackers learning which emails have accounts by timing.
  const dummyHash = bcrypt.hashSync("not-a-real-password-1", BCRYPT_ROUNDS);

  function signedIn(user) {
    return { token: tokens.sign(user), user: toPublicUser(user, storage) };
  }

  async function buildUser({ name, emailAddress, password, role }) {
    return {
      userId: crypto.randomUUID(),
      name: name.trim(),
      email: emailAddress,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role,
      status: "active",
      createdAt: new Date().toISOString(),
      departmentId: null,
      membershipState: role === "admin" ? "active" : "independent",
      profilePhotoKey: null,
      notificationPreferences: defaultNotificationPreferences(),
      tokenVersion: 0,
    };
  }

  function checkBasics(input) {
    const problems = onlyProblems({ name: checkName(input.name), email: checkEmail(input.email), password: checkPassword(input.password) });
    return problems;
  }

  return {
    async registerUser(input) {
      const problems = checkBasics(input);
      if (Object.keys(problems).length) throw badRequest("Please fix the highlighted fields.", problems);
      const user = await buildUser({ name: input.name, emailAddress: normaliseEmail(input.email), password: input.password, role: "user" });
      await users.create(user); // throws EMAIL_TAKEN if the email already exists
      return signedIn(user);
    },

    async registerAdmin(input) {
      const problems = {
        ...checkBasics(input),
        ...onlyProblems({ departmentName: checkDepartmentName(input.departmentName), departmentCode: checkDepartmentCode(input.departmentCode) }),
      };
      if (Object.keys(problems).length) throw badRequest("Please fix the highlighted fields.", problems);

      // Stop early, before creating anything, if departments cannot be created yet.
      if (!departments.isConnected()) {
        throw new AppError(503, "DEPARTMENT_SERVICE_NOT_CONNECTED", "Admin registration needs the department service, which is not connected yet.");
      }

      const user = await buildUser({ name: input.name, emailAddress: normaliseEmail(input.email), password: input.password, role: "admin" });
      await users.create(user);
      try {
        const department = await departments.createDepartment({
          name: input.departmentName.trim(),
          code: normaliseDepartmentCode(input.departmentCode),
          adminUserId: user.userId,
        });
        user.departmentId = department.departmentId;
        await users.update(user.userId, { departmentId: department.departmentId });
      } catch (error) {
        await users.remove(user.userId); // undo the half-finished sign-up
        if (error instanceof AppError && error.code === "DEPARTMENT_CODE_TAKEN") {
          throw badRequest("Please fix the highlighted fields.", { departmentCode: "That department code is already in use." }, "VALIDATION_ERROR");
        }
        throw error;
      }
      return signedIn(user);
    },

    async login({ email: rawEmail, password, expectedRole }) {
      if (checkEmail(rawEmail) || typeof password !== "string" || password.length === 0 || password.length > 200) throw unauthorized(BAD_LOGIN, "INVALID_CREDENTIALS");
      if (expectedRole !== undefined && !["admin", "user"].includes(expectedRole)) throw badRequest("Unknown account type.");

      const user = await users.findByEmail(normaliseEmail(rawEmail));
      const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
      if (!user || !matches) throw unauthorized(BAD_LOGIN, "INVALID_CREDENTIALS");

      // Only AFTER the password is right do we say the account is the other type, so this
      // message cannot be used to discover which emails exist.
      if (expectedRole && user.role !== expectedRole) {
        throw forbidden(
          user.role === "admin" ? "This is an Admin account. Please use the Admin sign-in." : "This is a User account. Please use the User sign-in.",
          "WRONG_ACCOUNT_TYPE"
        );
      }
      return signedIn(user);
    },

    async forgotPassword({ email: rawEmail }) {
      if (checkEmail(rawEmail)) throw badRequest("Enter a valid email address.", { email: checkEmail(rawEmail) });
      const user = await users.findByEmail(normaliseEmail(rawEmail));
      let resetLink = null;
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        await resets.save({
          tokenHash: sha256(token), // only a fingerprint is stored, never the token itself
          userId: user.userId,
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000).toISOString(),
        });
        const link = `${config.frontendUrl}/reset-password?token=${token}`;
        resetLink = link;

        // 1. Deliver via email gateway
        try {
          await email.sendPasswordReset({ to: user.email, name: user.name, link });
        } catch (err) {
          console.warn("[Email send notice]:", err.message);
        }

        // 2. Deliver via Amazon SNS if available
        if (snsService && typeof snsService.isEnabled === "function" && snsService.isEnabled()) {
          try {
            await snsService.publishNotification({
              userId: user.userId,
              type: "password_reset",
              subject: "UploadHub: Password Reset Request",
              message: `Hello ${user.name},\n\nYou requested to reset your UploadHub account password.\nUse the link below to choose a new password (valid for ${RESET_MINUTES} minutes):\n\n${link}\n\nIf you did not request this, you can safely ignore this email.`,
            });
          } catch (err) {
            console.warn("[SNS password reset notice]:", err.message);
          }
        }
      }
      // The same answer whether or not the email exists.
      const base = "If an account exists for that email, a reset link will be sent.";
      const hasDelivery = email.configured || email.developmentOnly || (snsService && typeof snsService.isEnabled === "function" && snsService.isEnabled());
      return {
        message: hasDelivery
          ? base
          : `${base} Email sending is not set up on this server yet, so nothing can be delivered right now.`,
        resetLink: !email.configured ? resetLink : undefined,
      };
    },

    async resetPassword({ token, password }) {
      const passwordProblem = checkPassword(password);
      if (passwordProblem) throw badRequest("Please fix the highlighted fields.", { password: passwordProblem });
      const invalid = new AppError(400, "INVALID_RESET_TOKEN", "This reset link is invalid or has expired. Please ask for a new one.");
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw invalid;

      const record = await resets.consume(sha256(token)); // single use
      if (!record || new Date(record.expiresAt).getTime() < Date.now()) throw invalid;
      const user = await users.findById(record.userId);
      if (!user) throw invalid;

      await users.update(user.userId, {
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        tokenVersion: (user.tokenVersion || 0) + 1, // signs out every device
      });
      return { message: "Your password has been changed. You can now sign in." };
    },
  };
}
