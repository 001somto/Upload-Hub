// tests/audit.test.js
// Tests for admin department audit logs and user activity history.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryAuditRepository } from "../src/repositories/memoryRepositories.js";
import { createAuditService } from "../src/services/auditService.js";

function setup() {
  const auditRepo = createMemoryAuditRepository();
  const auditService = createAuditService({ auditRepo });

  const adminUser = {
    userId: "admin-1",
    name: "Dr. Admin",
    role: "admin",
    departmentId: "dept-cs",
  };

  const regularUser = {
    userId: "user-2",
    name: "Student Bob",
    role: "user",
    departmentId: "dept-cs",
  };

  const otherUser = {
    userId: "user-3",
    name: "Dr. Physics",
    role: "admin",
    departmentId: "dept-phys",
  };

  return { auditService, auditRepo, adminUser, regularUser, otherUser };
}

test("audit: records events and lists user personal activity", async () => {
  const { auditService, regularUser } = setup();

  await auditService.record({
    userId: regularUser.userId,
    userName: regularUser.name,
    departmentId: regularUser.departmentId,
    action: "file.uploaded",
    target: "assignment.pdf",
  });

  await auditService.record({
    userId: regularUser.userId,
    userName: regularUser.name,
    departmentId: regularUser.departmentId,
    action: "share.created",
    target: "assignment.pdf",
  });

  const activity = await auditService.listMyActivity({ user: regularUser, page: 1, pageSize: 10 });
  assert.equal(activity.total, 2);
  assert.equal(activity.items.length, 2);
  assert.equal(activity.items[0].action, "share.created"); // newest first
  assert.equal(activity.items[1].action, "file.uploaded");
});

test("audit: department admin can view and filter department logs", async () => {
  const { auditService, adminUser, regularUser, otherUser } = setup();

  // Dept CS events
  await auditService.record({
    userId: adminUser.userId,
    userName: adminUser.name,
    departmentId: adminUser.departmentId,
    action: "folder.created",
    target: "Lecture Notes",
  });

  await auditService.record({
    userId: regularUser.userId,
    userName: regularUser.name,
    departmentId: regularUser.departmentId,
    action: "file.uploaded",
    target: "project.zip",
  });

  // Dept Physics event (different dept)
  await auditService.record({
    userId: otherUser.userId,
    userName: otherUser.name,
    departmentId: otherUser.departmentId,
    action: "file.uploaded",
    target: "quantum.pdf",
  });

  // Admin lists their department's audit trail
  const csLogs = await auditService.listDepartmentAudit({ admin: adminUser });
  assert.equal(csLogs.total, 2); // only CS events

  // Filter by action
  const uploadsOnly = await auditService.listDepartmentAudit({ admin: adminUser, action: "file.uploaded" });
  assert.equal(uploadsOnly.total, 1);
  assert.equal(uploadsOnly.items[0].target, "project.zip");

  // Filter by user
  const adminOnly = await auditService.listDepartmentAudit({ admin: adminUser, userId: adminUser.userId });
  assert.equal(adminOnly.total, 1);
  assert.equal(adminOnly.items[0].action, "folder.created");
});

test("audit: regular user cannot access department audit logs", async () => {
  const { auditService, regularUser } = setup();

  await assert.rejects(
    async () => {
      await auditService.listDepartmentAudit({ admin: regularUser });
    },
    (err) => err.status === 403
  );
});
