// tests/support/testKit.js
// WHAT THIS FILE IS: shared setup for the tests.
// WHAT IT DOES: builds the auth services on top of the in-memory database, a fake department
// gateway and a fake email gateway that remembers the links it was asked to send.

import { createAuthService } from "../../src/services/authService.js";
import { createTokenService } from "../../src/services/tokenService.js";
import { createUserService } from "../../src/services/userService.js";
import { createNoStorageGateway } from "../../src/gateways/storageGateway.js";
import { createMemoryResetTokenRepository, createMemoryUserRepository } from "../../src/repositories/memoryRepositories.js";
import { createAuthenticate } from "../../src/middleware/authenticate.js";

export const config = { jwtSecret: "test-secret-test-secret-test-secret-123", sessionHours: 8, frontendUrl: "http://site.test" };

export function build({ departmentsConnected = true } = {}) {
  const users = createMemoryUserRepository();
  const resets = createMemoryResetTokenRepository();
  const sentEmails = [];
  const email = { configured: true, developmentOnly: false, sendPasswordReset: async (mail) => sentEmails.push(mail) };
  const created = [];
  const departments = {
    isConnected: () => departmentsConnected,
    async createDepartment(input) {
      if (input.code === "TAKEN") {
        const { AppError } = await import("../../src/utils/errors.js");
        throw new AppError(409, "DEPARTMENT_CODE_TAKEN", "taken");
      }
      created.push(input);
      return { departmentId: `dept-${created.length}` };
    },
  };
  const tokens = createTokenService(config);
  const storage = createNoStorageGateway();
  const auth = createAuthService({ users, resets, departments, email, tokens, storage, config });
  const userService = createUserService({ users, tokens, storage });
  const authenticate = createAuthenticate({ users, tokens });
  // Runs the real authenticate middleware and returns the error it passed on (or null).
  async function check(token) {
    const req = { headers: { authorization: token ? `Bearer ${token}` : "" } };
    return new Promise((resolve) => authenticate(req, {}, (error) => resolve({ error: error || null, user: req.user })));
  }
  return { users, resets, auth, userService, tokens, sentEmails, created, check };
}

export const goodUser = { name: "Ada Obi", email: "Ada@Example.com", password: "Password1" };
