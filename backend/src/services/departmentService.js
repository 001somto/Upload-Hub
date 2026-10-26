// services/departmentService.js
// Business logic for departments, memberships, join requests, and admin controls.

import crypto from "crypto";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

export function createDepartmentService({ departments, users, auditService, notificationService }) {
  async function resolveAdminName(dept) {
    if (!dept) return "Admin";
    const adminId = dept.adminUserId || dept.adminId;
    if (adminId && users) {
      try {
        const adminUser = await users.findById(adminId);
        if (adminUser && adminUser.name) return adminUser.name;
      } catch {}
    }
    return dept.adminName || "Admin";
  }
  return {
    async searchDepartments(q) {
      const items = await departments.search(q || "");
      if (users && items && items.length > 0) {
        await Promise.all(
          items.map(async (item) => {
            if (!item.adminName || item.adminName === "Admin") {
              const dept = await departments.findById(item.departmentId);
              if (dept) {
                const name = await resolveAdminName(dept);
                if (name && name !== "Admin") {
                  item.adminName = name;
                }
              }
            }
          })
        );
      }
      return { items };
    },

    async getMembership(user) {
      if (user.departmentId) {
        const dept = await departments.findById(user.departmentId);
        const permissions = await departments.getPermissions(user.userId);
        const adminName = await resolveAdminName(dept);
        return {
          state: user.membershipState || "active",
          department: dept
            ? {
                departmentId: dept.departmentId,
                name: dept.name,
                code: dept.code,
                adminName,
              }
            : null,
          requestedAt: null,
          decidedAt: null,
          permissions,
        };
      }

      const pending = await departments.findPendingRequestByUser(user.userId);
      if (pending) {
        const dept = await departments.findById(pending.targetDepartmentId);
        const adminName = await resolveAdminName(dept);
        return {
          state: "pending",
          department: dept
            ? {
                departmentId: dept.departmentId,
                name: dept.name,
                code: dept.code,
                adminName,
              }
            : null,
          requestedAt: pending.requestedAt,
          decidedAt: null,
          permissions: [],
        };
      }

      return {
        state: user.membershipState || "independent",
        department: null,
        requestedAt: null,
        decidedAt: null,
        permissions: [],
      };
    },

    async requestToJoin(user, { departmentId, code }) {
      let dept = null;
      if (departmentId) {
        dept = await departments.findById(departmentId);
      } else if (code) {
        dept = await departments.findByCode(code);
      }

      if (!dept) throw notFound("Department not found.");

      const existingPending = await departments.findPendingRequestByUser(user.userId);
      if (existingPending) {
        await departments.updateRequest(existingPending.requestId, { status: "cancelled" });
      }

      const req = {
        requestId: crypto.randomUUID(),
        userId: user.userId,
        name: user.name,
        email: user.email,
        targetDepartmentId: dept.departmentId,
        requestedAt: new Date().toISOString(),
        status: "pending",
      };

      await departments.createRequest(req);
      await users.update(user.userId, { membershipState: "pending" });

      if (notificationService) {
        const targetAdminId = dept.adminId || dept.adminUserId;
        if (targetAdminId) {
          notificationService.send({
            userId: targetAdminId,
            type: "membership",
            message: `${user.name} sent a request to join your department (${dept.name}).`,
          });
        }
      }

      return this.getMembership({ ...user, membershipState: "pending" });
    },

    async cancelRequest(user) {
      const pending = await departments.findPendingRequestByUser(user.userId);
      if (pending) {
        await departments.updateRequest(pending.requestId, { status: "cancelled" });
      }
      await users.update(user.userId, { membershipState: "independent" });
      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "membership",
          message: "You cancelled your department join request.",
        });
      }
      return this.getMembership({ ...user, membershipState: "independent" });
    },

    async leaveDepartment(user) {
      await users.update(user.userId, { departmentId: null, membershipState: "independent" });
      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "membership",
          message: "You left the department.",
        });
      }
      return this.getMembership({ ...user, departmentId: null, membershipState: "independent" });
    },

    // Admin side: get members
    async _resolveAdminDeptId(admin) {
      if (admin.departmentId) return admin.departmentId;
      if (departments && departments.listAll) {
        const all = await departments.listAll();
        const found = all.find((d) => d.adminUserId === admin.userId && !d.departmentId.startsWith("REQ#") && !d.departmentId.startsWith("PERM#"));
        if (found) {
          admin.departmentId = found.departmentId;
          if (users && users.update) {
            await users.update(admin.userId, { departmentId: found.departmentId }).catch(() => {});
          }
          return found.departmentId;
        }
      }
      return null;
    },

    async getMembers(admin, { q = "", status, page = 1, pageSize = 20 }) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can view department members.");
      }

      const members = [];
      const lower = q.toLowerCase();

      // We load all users belonging to this department
      // (in memory or DynamoDB, users table holds all members)
      // Since users repository might not have a direct query, we scan or search
      const dept = await departments.findById(admin.departmentId);
      if (!dept) throw notFound("Department not found.");

      // Load all users belonging to this department (excludes admin themselves)
      let allUsers = [];
      if (users.listByDepartment) {
        allUsers = await users.listByDepartment(admin.departmentId);
      }

      // Exclude the admin from the members list — only approved users appear here
      let filtered = allUsers
        .filter((u) => u.userId !== admin.userId && u.role !== "admin" && (u.membershipState || "active") === "active")
        .filter((u) => {
          if (status && u.status !== status) return false;
          if (!lower) return true;
          return (u.name && u.name.toLowerCase().includes(lower)) || (u.email && u.email.toLowerCase().includes(lower));
        });

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const items = await Promise.all(
        filtered.slice(start, start + pageSize).map(async (u) => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          status: u.status,
          membershipState: u.membershipState || "active",
          permissions: await departments.getPermissions(u.userId),
        }))
      );

      return { items, page: Number(page), pageSize: Number(pageSize), total };
    },

    async getRequests(admin) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can view join requests.");
      }
      const items = await departments.listPendingRequests(admin.departmentId);
      return { items };
    },

    async decideRequest(admin, requestId, decision) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can approve or reject join requests.");
      }

      const req = await departments.findRequestById(requestId);
      if (!req) throw notFound("Request not found.");

      if (decision === "approve") {
        await users.update(req.userId, { departmentId: admin.departmentId, membershipState: "active" });
        await departments.updateRequest(requestId, { status: "approved" });
        const member = await users.findById(req.userId);
        if (auditService) {
          auditService.record({ userId: admin.userId, userName: admin.name, userRole: admin.role, departmentId: admin.departmentId, action: "member.approved", target: member ? member.name : req.userId });
        }
        if (notificationService) {
          notificationService.send({
            userId: req.userId,
            type: "membership",
            message: `Your request to join the department was approved!`,
          });
          notificationService.send({
            userId: admin.userId,
            type: "membership",
            message: `You approved ${member ? member.name : "member"}'s join request.`,
          });
        }
      } else if (decision === "reject") {
        await users.update(req.userId, { membershipState: "rejected" });
        await departments.updateRequest(requestId, { status: "rejected" });
        const member = await users.findById(req.userId);
        if (auditService) {
          auditService.record({ userId: admin.userId, userName: admin.name, userRole: admin.role, departmentId: admin.departmentId, action: "member.rejected", target: member ? member.name : req.userId });
        }
        if (notificationService) {
          notificationService.send({
            userId: req.userId,
            type: "membership",
            message: `Your request to join the department was declined.`,
          });
          notificationService.send({
            userId: admin.userId,
            type: "membership",
            message: `You declined ${member ? member.name : "the"} join request.`,
          });
        }
      } else {
        throw badRequest("Decision must be 'approve' or 'reject'.");
      }

      return { ok: true };
    },

    async removeMember(admin, userId) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can remove members.");
      }
      const member = await users.findById(userId);
      await users.update(userId, { departmentId: null, membershipState: "removed" });
      if (auditService) {
        auditService.record({ userId: admin.userId, userName: admin.name, userRole: admin.role, departmentId: admin.departmentId, action: "member.removed", target: member ? member.name : userId });
      }
      if (notificationService) {
        notificationService.send({
          userId,
          type: "membership",
          message: "Your membership in the department has ended.",
        });
        notificationService.send({
          userId: admin.userId,
          type: "membership",
          message: `You removed ${member ? member.name : "member"} from the department.`,
        });
      }
      return { ok: true };
    },

    async setMemberStatus(admin, userId, status) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can change member status.");
      }
      const member = await users.findById(userId);
      const newStatus = status === "disabled" ? "disabled" : "active";
      await users.update(userId, { status: newStatus });
      if (auditService) {
        auditService.record({ userId: admin.userId, userName: admin.name, userRole: admin.role, departmentId: admin.departmentId, action: newStatus === "disabled" ? "member.paused" : "member.restored", target: member ? member.name : userId });
      }
      if (notificationService) {
        notificationService.send({
          userId,
          type: "membership",
          message: newStatus === "disabled"
            ? "Your department access was paused by the administrator."
            : "Your department access has been restored!",
        });
        notificationService.send({
          userId: admin.userId,
          type: "membership",
          message: `You ${newStatus === "disabled" ? "paused" : "restored"} department access for ${member ? member.name : "member"}.`,
        });
      }
      return { ok: true };
    },

    async setPermissions(admin, userId, permissions) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can configure permissions.");
      }
      await departments.setPermissions(userId, permissions || []);
      const member = await users.findById(userId);
      if (auditService) {
        auditService.record({ userId: admin.userId, userName: admin.name, userRole: admin.role, departmentId: admin.departmentId, action: "permission.changed", target: member ? member.name : userId });
      }
      if (notificationService) {
        notificationService.send({
          userId,
          type: "membership",
          message: "Your department permissions were updated by the administrator.",
        });
        notificationService.send({
          userId: admin.userId,
          type: "membership",
          message: `You updated permissions for ${member ? member.name : "member"}.`,
        });
      }
      return { ok: true };
    },

    async bulkPermissions(admin, userIds = [], permissions = []) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can configure permissions.");
      }
      const updated = await departments.bulkSetPermissions(userIds, permissions);
      if (notificationService) {
        notificationService.send({
          userId: admin.userId,
          type: "membership",
          message: `You updated permissions for ${userIds.length} department member(s).`,
        });
      }
      return { updated };
    },

    async getSettings(admin) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can view department settings.");
      }
      const dept = await departments.findById(admin.departmentId);
      if (!dept) throw notFound("Department not found.");
      return {
        name: dept.name,
        code: dept.code,
        visibleInDirectory: dept.visibleInDirectory !== false,
      };
    },

    async updateSettings(admin, { visibleInDirectory }) {
      const deptId = await this._resolveAdminDeptId(admin);
      if (admin.role !== "admin" || !deptId) {
        throw forbidden("Only a department administrator can update department settings.");
      }
      const updated = await departments.update(admin.departmentId, {
        visibleInDirectory: Boolean(visibleInDirectory),
      });
      if (notificationService) {
        notificationService.send({
          userId: admin.userId,
          type: "settings",
          message: "Department directory visibility settings were updated.",
        });
      }
      return {
        name: updated.name,
        code: updated.code,
        visibleInDirectory: updated.visibleInDirectory !== false,
      };
    },
  };
}
