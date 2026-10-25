// repositories/memoryRepositories.js
// WHAT THIS FILE IS: a stand-in database that keeps everything in the computer's memory.
// WHAT IT DOES: behaves exactly like the DynamoDB version (same functions) but forgets
// everything when the server stops. It is used by the automated tests, and by
// STORAGE_MODE=memory for a quick try. It is refused in production.

import { conflict } from "../utils/errors.js";

export function createMemoryUserRepository() {
  const byId = new Map();
  const idByEmail = new Map();
  const clone = (user) => (user ? structuredClone(user) : null);

  return {
    async create(user) {
      if (idByEmail.has(user.email)) throw conflict("An account with this email already exists.", { email: "An account with this email already exists." }, "EMAIL_TAKEN");
      byId.set(user.userId, structuredClone(user));
      idByEmail.set(user.email, user.userId);
      return clone(user);
    },
    async findById(userId) {
      return clone(byId.get(userId));
    },
    async findByEmail(email) {
      const id = idByEmail.get(email);
      return id ? clone(byId.get(id)) : null;
    },
    async update(userId, changes) {
      const current = byId.get(userId);
      if (!current) return null;
      Object.assign(current, structuredClone(changes));
      return clone(current);
    },
    async remove(userId) {
      const current = byId.get(userId);
      if (!current) return;
      idByEmail.delete(current.email);
      byId.delete(userId);
    },
  };
}

export function createMemoryResetTokenRepository() {
  const tokens = new Map();
  return {
    async save(record) {
      tokens.set(record.tokenHash, { ...record });
    },
    // Reads the token AND deletes it in one step, so it can only ever be used once.
    async consume(tokenHash) {
      const record = tokens.get(tokenHash);
      tokens.delete(tokenHash);
      return record ? { ...record } : null;
    },
  };
}
