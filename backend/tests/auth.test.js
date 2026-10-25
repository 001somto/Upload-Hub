// tests/auth.test.js
// WHAT THIS FILE IS: automatic checks for sign-up, sign-in and password reset.
// HOW TO RUN: "npm test". Each test builds a fresh in-memory database.

import assert from "node:assert/strict";
import { test } from "node:test";
import { build, goodUser } from "./support/testKit.js";

const rejects = (promise, status, code) =>
  assert.rejects(promise, (error) => {
    assert.equal(error.status, status, `status ${error.status} ${error.message}`);
    if (code) assert.equal(error.code, code);
    return true;
  });

test("a User can register and gets a token and a safe profile", async () => {
  const { auth } = build();
  const result = await auth.registerUser(goodUser);
  assert.ok(result.token);
  assert.equal(result.user.email, "ada@example.com");
  assert.equal(result.user.role, "user");
  assert.equal(result.user.membershipState, "independent");
  assert.equal(result.user.passwordHash, undefined);
  assert.equal(result.user.tokenVersion, undefined);
});

test("registration is refused for bad name, email and passwords", async () => {
  const { auth } = build();
  await rejects(auth.registerUser({ name: "A", email: "nope", password: "short" }), 400, "VALIDATION_ERROR");
  await rejects(auth.registerUser({ ...goodUser, password: "allletters" }), 400);
  await rejects(auth.registerUser({ ...goodUser, password: "12345678" }), 400);
  await rejects(auth.registerUser({ ...goodUser, password: "a1" + "x".repeat(80) }), 400);
  await rejects(auth.registerUser({ name: 5, email: {}, password: [] }), 400);
});

test("the same email cannot register twice, even with different capitals", async () => {
  const { auth } = build();
  await auth.registerUser(goodUser);
  await rejects(auth.registerUser({ ...goodUser, email: "ADA@example.com" }), 409, "EMAIL_TAKEN");
});

test("Admin registration creates the department and links it", async () => {
  const { auth, created } = build();
  const result = await auth.registerAdmin({ ...goodUser, departmentName: "Computer Science", departmentCode: "csc" });
  assert.equal(result.user.role, "admin");
  assert.equal(result.user.departmentId, "dept-1");
  assert.equal(result.user.membershipState, "active");
  assert.deepEqual(created[0], { name: "Computer Science", code: "CSC", adminUserId: result.user.userId });
});

test("Admin registration stops with 503 and creates nothing when departments are not connected", async () => {
  const { auth, users } = build({ departmentsConnected: false });
  await rejects(auth.registerAdmin({ ...goodUser, departmentName: "Computer Science", departmentCode: "CSC" }), 503, "DEPARTMENT_SERVICE_NOT_CONNECTED");
  assert.equal(await users.findByEmail("ada@example.com"), null);
});

test("Admin registration undoes the account when the department code is taken", async () => {
  const { auth, users } = build();
  await assert.rejects(auth.registerAdmin({ ...goodUser, departmentName: "Computer Science", departmentCode: "TAKEN" }), (e) => e.status === 400 && Boolean(e.fields.departmentCode));
  assert.equal(await users.findByEmail("ada@example.com"), null);
});

test("Admin registration validates the department fields", async () => {
  const { auth } = build();
  await assert.rejects(auth.registerAdmin({ ...goodUser, departmentName: "", departmentCode: "x" }), (e) => Boolean(e.fields.departmentName && e.fields.departmentCode));
});

test("login works, ignoring email capitals, and wrong details give one generic message", async () => {
  const { auth } = build();
  await auth.registerUser(goodUser);
  const ok = await auth.login({ email: "ADA@example.com", password: "Password1" });
  assert.ok(ok.token);
  await assert.rejects(auth.login({ email: "ada@example.com", password: "wrong" }), (e) => e.status === 401 && e.message === "Incorrect email or password.");
  await assert.rejects(auth.login({ email: "nobody@example.com", password: "Password1" }), (e) => e.status === 401 && e.message === "Incorrect email or password.");
  await rejects(auth.login({ email: "ada@example.com" }), 401);
});

test("signing in on the wrong page is refused only AFTER the password is correct", async () => {
  const { auth } = build();
  await auth.registerUser(goodUser);
  await rejects(auth.login({ email: "ada@example.com", password: "Password1", expectedRole: "admin" }), 403, "WRONG_ACCOUNT_TYPE");
  // wrong password must NOT reveal the account type
  await rejects(auth.login({ email: "ada@example.com", password: "Nope12345", expectedRole: "admin" }), 401, "INVALID_CREDENTIALS");
  await rejects(auth.login({ email: "nobody@example.com", password: "Nope12345", expectedRole: "admin" }), 401, "INVALID_CREDENTIALS");
  assert.ok((await auth.login({ email: "ada@example.com", password: "Password1", expectedRole: "user" })).token);
});

test("a paused (disabled) account can still sign in (it only loses department access)", async () => {
  const { auth, users } = build();
  const { user } = await auth.registerUser(goodUser);
  await users.update(user.userId, { status: "disabled" });
  const result = await auth.login({ email: "ada@example.com", password: "Password1" });
  assert.equal(result.user.status, "disabled");
});

test("forgot password answers the same for known and unknown emails, and only emails real accounts", async () => {
  const { auth, sentEmails } = build();
  await auth.registerUser(goodUser);
  const known = await auth.forgotPassword({ email: "ada@example.com" });
  const unknown = await auth.forgotPassword({ email: "ghost@example.com" });
  assert.equal(known.message, unknown.message);
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].link, /^http:\/\/site\.test\/reset-password\?token=[a-f0-9]{64}$/);
  await rejects(auth.forgotPassword({ email: "bad" }), 400);
});

test("forgot password says honestly when email sending is not set up", async () => {
  const { auth } = build();
  // swap in an unconfigured email gateway by building a second service
  const { createAuthService } = await import("../src/services/authService.js");
  const { createTokenService } = await import("../src/services/tokenService.js");
  const { createMemoryUserRepository, createMemoryResetTokenRepository } = await import("../src/repositories/memoryRepositories.js");
  const { config } = await import("./support/testKit.js");
  const none = createAuthService({
    users: createMemoryUserRepository(), resets: createMemoryResetTokenRepository(), departments: { isConnected: () => true },
    email: { configured: false, developmentOnly: false, sendPasswordReset: async () => {} }, tokens: createTokenService(config), storage: { photoUrl: () => null }, config,
  });
  const result = await none.forgotPassword({ email: "a@b.co" });
  assert.match(result.message, /not set up/);
  assert.ok(auth);
});

test("reset password works once, changes the password and signs out old tokens", async () => {
  const { auth, sentEmails, check } = build();
  const { token: oldToken } = await auth.registerUser(goodUser);
  await auth.forgotPassword({ email: "ada@example.com" });
  const resetToken = sentEmails[0].link.split("token=")[1];
  await auth.resetPassword({ token: resetToken, password: "NewPassw0rd" });
  await rejects(auth.resetPassword({ token: resetToken, password: "Another1234" }), 400, "INVALID_RESET_TOKEN"); // single use
  await rejects(auth.login({ email: "ada@example.com", password: "Password1" }), 401);
  assert.ok((await auth.login({ email: "ada@example.com", password: "NewPassw0rd" })).token);
  assert.equal((await check(oldToken)).error.status, 401); // old session is dead
});

test("reset refuses bad, weak and expired tokens", async () => {
  const { auth, resets, users, sentEmails } = build();
  await rejects(auth.resetPassword({ token: "x", password: "Password1" }), 400, "INVALID_RESET_TOKEN");
  await rejects(auth.resetPassword({ token: "a".repeat(64), password: "Password1" }), 400, "INVALID_RESET_TOKEN");
  await rejects(auth.resetPassword({ token: "a".repeat(64), password: "weak" }), 400, "VALIDATION_ERROR");
  await auth.registerUser(goodUser);
  await auth.forgotPassword({ email: "ada@example.com" });
  const token = sentEmails[0].link.split("token=")[1];
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await resets.consume(hash);
  await resets.save({ ...record, expiresAt: new Date(Date.now() - 1000).toISOString() });
  await rejects(auth.resetPassword({ token, password: "Password1x" }), 400, "INVALID_RESET_TOKEN");
  assert.ok(users);
});

test("only a fingerprint of the reset token is stored", async () => {
  const { auth, resets, sentEmails } = build();
  await auth.registerUser(goodUser);
  await auth.forgotPassword({ email: "ada@example.com" });
  const token = sentEmails[0].link.split("token=")[1];
  assert.equal(await resets.consume(token), null); // the raw token is not a key
});
