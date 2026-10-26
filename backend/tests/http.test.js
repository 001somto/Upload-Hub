// tests/http.test.js
// WHAT THIS FILE IS: checks the real web server end to end (requests in, answers out).
// NOTE: it needs the packages installed ("npm install"). If they are missing it skips itself.

import assert from "node:assert/strict";
import { test } from "node:test";

let express;
try {
  express = await import("express");
} catch {
  express = null;
}

test("HTTP: sign up, sign in, read profile, unknown route, bad JSON", { skip: !express && "run npm install first" }, async () => {
  const { createApp, buildDependencies } = await import("../src/app.js");
  const config = {
    nodeEnv: "test", production: false, port: 0, jwtSecret: "test-secret-test-secret-test-secret-123", sessionHours: 8,
    corsOrigins: ["http://localhost:5173"], frontendUrl: "http://localhost:5173", trustProxy: false,
    storageMode: "memory", emailMode: "none", aws: {}, rateLimit: false,
  };
  const app = createApp(buildDependencies(config));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, token) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    return { status: response.status, json: await response.json() };
  };
  try {
    const up = await call("POST", "/api/auth/register/user", { name: "Ada Obi", email: "ada@example.com", password: "Password1" });
    assert.equal(up.status, 201);
    const me = await call("GET", "/api/users/me", undefined, up.json.data.token);
    assert.equal(me.status, 200);
    assert.equal(me.json.data.user.email, "ada@example.com");
    assert.equal((await call("GET", "/api/users/me")).status, 401);
    assert.equal((await call("POST", "/api/auth/login", { email: "ada@example.com", password: "bad" })).json.error.code, "INVALID_CREDENTIALS");
    assert.equal((await call("POST", "/api/auth/register/admin", { name: "Bo Eze", email: "bo@example.com", password: "Password1", departmentName: "Physics", departmentCode: "PHY" })).status, 201);
    assert.equal((await call("GET", "/api/nonexistent-route")).json.error.code, "ROUTE_NOT_FOUND");
    assert.equal((await call("GET", "/api/files", undefined, up.json.data.token)).status, 200);
    assert.equal((await call("POST", "/api/auth/login", "{bad json")).json.error.code, "BAD_JSON");
    assert.equal((await call("PATCH", "/api/users/me", { role: "admin" }, up.json.data.token)).json.error.code, "FIELD_NOT_ALLOWED");
  } finally {
    server.close();
  }
});
