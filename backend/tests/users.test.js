// tests/users.test.js
// WHAT THIS FILE IS: automatic checks for profile changes, password change and the sign-in gate.

import assert from "node:assert/strict";
import { test } from "node:test";
import { build, goodUser } from "./support/testKit.js";

async function signedUp() {
  const kit = build();
  const { token, user } = await kit.auth.registerUser(goodUser);
  const stored = await kit.users.findById(user.userId);
  return { ...kit, token, user, stored };
}

test("authenticate accepts a good token and loads the account", async () => {
  const { check, token, user } = await signedUp();
  const result = await check(token);
  assert.equal(result.error, null);
  assert.equal(result.user.userId, user.userId);
});

test("authenticate refuses missing, junk and tampered tokens", async () => {
  const { check, token } = await signedUp();
  assert.equal((await check("")).error.status, 401);
  assert.equal((await check("junk")).error.status, 401);
  assert.equal((await check(token.slice(0, -2) + "xx")).error.status, 401);
});

test("authenticate uses the database role, not a claim in the token", async () => {
  const { check, token, users, user } = await signedUp();
  await users.update(user.userId, { role: "admin" });
  assert.equal((await check(token)).user.role, "admin");
});

test("profile: name and notification preferences can change", async () => {
  const { userService, stored } = await signedUp();
  const updated = await userService.updateProfile(stored, { name: "  Ada Nwosu  ", notificationPreferences: { securityAlerts: false } });
  assert.equal(updated.name, "Ada Nwosu");
  assert.equal(updated.notificationPreferences.securityAlerts, false);
  assert.equal(updated.notificationPreferences.uploadConfirmations, true); // others kept
});

test("profile: forbidden fields are rejected and nothing changes", async () => {
  const { userService, stored, users } = await signedUp();
  for (const body of [{ role: "admin" }, { status: "disabled" }, { email: "x@y.co" }, { departmentId: "d1" }, { membershipState: "active" }, { passwordHash: "x" }, { name: "Okay Name", role: "admin" }]) {
    await assert.rejects(userService.updateProfile(stored, body), (e) => e.status === 400 && e.code === "FIELD_NOT_ALLOWED");
  }
  const after = await users.findById(stored.userId);
  assert.equal(after.role, "user");
  assert.equal(after.name, "Ada Obi");
});

test("profile: bad values are rejected", async () => {
  const { userService, stored } = await signedUp();
  await assert.rejects(userService.updateProfile(stored, {}), (e) => e.status === 400);
  await assert.rejects(userService.updateProfile(stored, { name: "A" }), (e) => Boolean(e.fields.name));
  await assert.rejects(userService.updateProfile(stored, { notificationPreferences: { hack: true } }), (e) => Boolean(e.fields.notificationPreferences));
  await assert.rejects(userService.updateProfile(stored, { notificationPreferences: { securityAlerts: "no" } }), (e) => Boolean(e.fields.notificationPreferences));
  await assert.rejects(userService.updateProfile(stored, null), (e) => e.status === 400);
});

test("profile photo key must be inside the person's own folder", async () => {
  const { userService, stored } = await signedUp();
  await assert.rejects(userService.updateProfile(stored, { profilePhotoKey: "profile-photos/someone-else/a.png" }), (e) => Boolean(e.fields.profilePhotoKey));
  await assert.rejects(userService.updateProfile(stored, { profilePhotoKey: `profile-photos/${stored.userId}/../x.png` }), (e) => Boolean(e.fields.profilePhotoKey));
  const ok = await userService.updateProfile(stored, { profilePhotoKey: `profile-photos/${stored.userId}/a.png` });
  assert.equal(ok.profilePhotoUrl, null); // no storage connected, so no link yet
});

test("change password: needs the right current password and a valid new one", async () => {
  const { userService, stored } = await signedUp();
  await assert.rejects(userService.changePassword(stored, { currentPassword: "Wrong1234", newPassword: "NewPassw0rd" }), (e) => Boolean(e.fields.currentPassword));
  await assert.rejects(userService.changePassword(stored, { currentPassword: "Password1", newPassword: "weak" }), (e) => Boolean(e.fields.newPassword));
  await assert.rejects(userService.changePassword(stored, { currentPassword: "Password1", newPassword: "Password1" }), (e) => Boolean(e.fields.newPassword));
  await assert.rejects(userService.changePassword(stored, {}), (e) => Boolean(e.fields.currentPassword));
});

test("change password: new password works, old token dies, the returned token works", async () => {
  const { userService, stored, auth, check, token } = await signedUp();
  const result = await userService.changePassword(stored, { currentPassword: "Password1", newPassword: "NewPassw0rd" });
  assert.ok(result.token);
  assert.equal((await check(token)).error.status, 401);
  assert.equal((await check(result.token)).error, null);
  assert.ok((await auth.login({ email: "ada@example.com", password: "NewPassw0rd" })).token);
});
