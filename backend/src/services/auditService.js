// services/auditService.js
// Records and queries activity audit trails for departments and users.

import crypto from "crypto";
import { forbidden } from "../utils/errors.js";

export function createAuditService({ auditRepo, users }) {
  let lastTimestampMs = 0;

  return {
    async record({ userId, userName, userRole = "user", departmentId = null, action, target = "" }) {
      if (!userId || !action) return;
      const timestampMs = Math.max(Date.now(), lastTimestampMs + 1);
      lastTimestampMs = timestampMs;

      const entry = {
        logId: crypto.randomUUID(),
        userId,
        userName: userName || "User",
        userRole: userRole || "user",
        departmentId: departmentId || null,
        action,
        target: target || "",
        timestamp: new Date(timestampMs).toISOString(),
      };
      try {
        await auditRepo.record(entry);
      } catch (err) {
        console.error("Failed to record audit event:", err.message);
      }
      return entry;
    },

    async listDepartmentAudit({ admin, userId, action, from, to, page = 1, pageSize = 20 }) {
      if (admin.role !== "admin") {
        throw forbidden("Only a department administrator can view the department audit trail.");
      }
      const data = await auditRepo.list({
        departmentId: admin.departmentId,
        userId: userId || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
      });

      // Build a role-lookup cache for items that don't have userRole stored yet.
      // This handles audit records created before the userRole field was added.
      const roleCache = new Map();
      const itemsWithRole = await Promise.all(
        (data.items || []).map(async (item) => {
          if (item.userRole) return item;
          // Cache lookups so we don't hit DynamoDB repeatedly for the same user
          if (!roleCache.has(item.userId)) {
            try {
              const u = users ? await users.findById(item.userId) : null;
              roleCache.set(item.userId, u ? u.role || "user" : "user");
            } catch {
              roleCache.set(item.userId, "user");
            }
          }
          return { ...item, userRole: roleCache.get(item.userId) };
        })
      );

      return {
        ...data,
        items: itemsWithRole,
      };
    },

    async listMyActivity({ user, page = 1, pageSize = 20 }) {
      return auditRepo.listForUser({
        userId: user.userId,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
      });
    },
  };
}
