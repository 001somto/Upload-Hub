// tests/validators.test.js
// WHAT THIS FILE IS: checks that the field rules behave as written.

import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEmail, checkPassword, checkDepartmentCode, cleanNotificationPreferences } from "../src/utils/validators.js";

test("password rule: 8+ chars with a letter and a number, max 72 bytes", () => {
  assert.equal(checkPassword("Password1"), "");
  assert.notEqual(checkPassword("short1"), "");
  assert.notEqual(checkPassword("nonumbers"), "");
  assert.notEqual(checkPassword("12345678"), "");
  assert.notEqual(checkPassword("a1" + "b".repeat(71)), "");
  assert.notEqual(checkPassword(undefined), "");
});

test("email rule", () => {
  assert.equal(checkEmail("a@b.co"), "");
  assert.notEqual(checkEmail("a@b"), "");
  assert.notEqual(checkEmail(""), "");
  assert.notEqual(checkEmail(null), "");
});

test("department code rule", () => {
  assert.equal(checkDepartmentCode("csc"), "");
  assert.notEqual(checkDepartmentCode("c"), "");
  assert.notEqual(checkDepartmentCode("TOO-LONG-CODE"), "");
});

test("notification preferences: only known keys with true/false", () => {
  assert.deepEqual(cleanNotificationPreferences({ securityAlerts: false }), { securityAlerts: false });
  assert.equal(cleanNotificationPreferences({ other: true }), null);
  assert.equal(cleanNotificationPreferences([]), null);
});
