// repositories/memoryRepositories.js
// Stand-in database that keeps everything in memory.
// Behaves like DynamoDB but forgets everything when server stops.

import { conflict } from "../utils/errors.js";
import { categorizeFile } from "../utils/fileHelpers.js";

const clone = (item) => (item ? structuredClone(item) : null);

export function createMemoryUserRepository() {
  const byId = new Map();
  const idByEmail = new Map();

  return {
    async create(user) {
      if (idByEmail.has(user.email)) {
        throw conflict("An account with this email already exists.", { email: "An account with this email already exists." }, "EMAIL_TAKEN");
      }
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
    async listByDepartment(departmentId) {
      if (!departmentId) return [];
      const all = [];
      for (const u of byId.values()) {
        if (u.departmentId === departmentId) all.push(clone(u));
      }
      return all;
    },
  };
}

export function createMemoryResetTokenRepository() {
  const tokens = new Map();
  return {
    async save(record) {
      tokens.set(record.tokenHash, { ...record });
    },
    async consume(tokenHash) {
      const record = tokens.get(tokenHash);
      tokens.delete(tokenHash);
      return record ? { ...record } : null;
    },
  };
}

export function createMemoryUploadSessionRepository() {
  const sessions = new Map();
  return {
    async save(session) {
      sessions.set(session.uploadId, { ...session });
    },
    async get(uploadId) {
      const session = sessions.get(uploadId);
      if (!session) return null;
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        sessions.delete(uploadId);
        return null;
      }
      return clone(session);
    },
    async delete(uploadId) {
      sessions.delete(uploadId);
    },
  };
}

export function createMemoryFolderRepository() {
  const folders = new Map();

  function getSubfolderIds(folderId) {
    const ids = [];
    for (const [id, f] of folders.entries()) {
      if (f.parentFolderId === folderId) {
        ids.push(id, ...getSubfolderIds(id));
      }
    }
    return ids;
  }

  return {
    async findById(folderId) {
      return clone(folders.get(folderId));
    },
    async create(folder) {
      folders.set(folder.folderId, structuredClone(folder));
      return clone(folder);
    },
    async update(folderId, changes) {
      const current = folders.get(folderId);
      if (!current) return null;
      Object.assign(current, structuredClone(changes));
      return clone(current);
    },
    async list({ scope, parentFolderId = null, ownerId, departmentId }) {
      const items = [];
      for (const f of folders.values()) {
        if (f.scope !== scope) continue;
        if (scope === "department" && f.departmentId !== departmentId) continue;
        if (scope === "independent" && f.ownerId !== ownerId) continue;
        if ((f.parentFolderId || null) !== (parentFolderId || null)) continue;
        items.push(clone(f));
      }
      return items.sort((a, b) => a.name.localeCompare(b.name));
    },
    async getBreadcrumbs(folderId) {
      if (!folderId) return [];
      const crumbs = [];
      let currentId = folderId;
      const seen = new Set();
      while (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        const f = folders.get(currentId);
        if (!f) break;
        crumbs.unshift({ folderId: f.folderId, name: f.name });
        currentId = f.parentFolderId;
      }
      return crumbs;
    },
    async deleteMany(folderIds) {
      const allToDelete = new Set(folderIds);
      for (const id of folderIds) {
        for (const subId of getSubfolderIds(id)) {
          allToDelete.add(subId);
        }
      }
      for (const id of allToDelete) {
        folders.delete(id);
      }
      return Array.from(allToDelete);
    },
  };
}

export function createMemoryFileRepository() {
  const files = new Map();

  return {
    async findById(fileId) {
      return clone(files.get(fileId));
    },
    async create(file) {
      files.set(file.fileId, structuredClone(file));
      return clone(file);
    },
    async update(fileId, changes) {
      const current = files.get(fileId);
      if (!current) return null;
      Object.assign(current, structuredClone(changes));
      return clone(current);
    },
    async list({ scope, folderId = null, ownerId, departmentId, q = "", sort = "date", order = "desc" }) {
      let items = [];
      for (const f of files.values()) {
        if (f.scope !== scope) continue;
        if (scope === "department" && f.departmentId !== departmentId) continue;
        if (scope === "independent" && f.ownerId !== ownerId) continue;
        if ((f.folderId || null) !== (folderId || null)) continue;
        if (q && !f.name.toLowerCase().includes(q.toLowerCase())) continue;
        items.push(clone(f));
      }

      items.sort((a, b) => {
        let cmp = 0;
        if (sort === "name") cmp = a.name.localeCompare(b.name);
        else if (sort === "size") cmp = (a.size || 0) - (b.size || 0);
        else cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        return order === "asc" ? cmp : -cmp;
      });

      return items;
    },
    async listNamesInFolder({ scope, folderId = null, ownerId, departmentId }) {
      const names = [];
      for (const f of files.values()) {
        if (f.scope !== scope) continue;
        if (scope === "department" && f.departmentId !== departmentId) continue;
        if (scope === "independent" && f.ownerId !== ownerId) continue;
        if ((f.folderId || null) !== (folderId || null)) continue;
        names.push(f.name);
      }
      return names;
    },
    async deleteMany(fileIds) {
      const deleted = [];
      for (const id of fileIds) {
        const item = files.get(id);
        if (item) {
          deleted.push(clone(item));
          files.delete(id);
        }
      }
      return deleted;
    },
    async deleteByFolderIds(folderIds) {
      const idSet = new Set(folderIds);
      const deleted = [];
      for (const [id, f] of files.entries()) {
        if (f.folderId && idSet.has(f.folderId)) {
          deleted.push(clone(f));
          files.delete(id);
        }
      }
      return deleted;
    },
    async getStorageUsage(userId, limitBytes = 1024 * 1024 * 1024) {
      let usedBytes = 0;
      let fileCount = 0;
      const userFiles = [];
      const byTypeMap = {};

      for (const f of files.values()) {
        if (f.ownerId === userId && f.scope === "independent") {
          usedBytes += f.size || 0;
          fileCount++;
          userFiles.push(f);
          const cat = categorizeFile(f.name, f.contentType);
          byTypeMap[cat] = (byTypeMap[cat] || 0) + (f.size || 0);
        }
      }

      userFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const recentUploads = userFiles.slice(0, 5).map(clone);

      const byType = Object.entries(byTypeMap).map(([type, bytes]) => ({ type, bytes }));

      return {
        usedBytes,
        limitBytes,
        remainingBytes: Math.max(0, limitBytes - usedBytes),
        fileCount,
        recentUploads,
        byType,
      };
    },
    async getDepartmentStorageUsage(departmentId, days = 30, limitBytes = 5 * 1024 * 1024 * 1024) {
      let usedBytes = 0;
      let fileCount = 0;
      const deptFiles = [];
      const memberMap = new Map();

      for (const f of files.values()) {
        if (f.scope === "department" && f.departmentId === departmentId) {
          usedBytes += f.size || 0;
          fileCount++;
          deptFiles.push(f);
          const current = memberMap.get(f.ownerId) || { userId: f.ownerId, name: f.ownerName || "Member", bytes: 0 };
          current.bytes += f.size || 0;
          memberMap.set(f.ownerId, current);
        }
      }

      deptFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const recentUploads = deptFiles.slice(0, 5).map(clone);

      const byMember = Array.from(memberMap.values()).sort((a, b) => b.bytes - a.bytes);

      // Trend for the last N days
      const trend = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        // Calculate cumulative or daily files
        let dayTotal = 0;
        for (const f of deptFiles) {
          if (f.uploadedAt.split("T")[0] <= dateStr) {
            dayTotal += f.size || 0;
          }
        }
        trend.push({ date: dateStr, usedBytes: dayTotal });
      }

      return {
        usedBytes,
        limitBytes,
        remainingBytes: Math.max(0, limitBytes - usedBytes),
        activeMembers: memberMap.size,
        recentUploads,
        byMember,
        trend,
      };
    },
  };
}

export function createMemoryDepartmentRepository() {
  const departments = new Map();
  const requests = new Map();
  const permissions = new Map();

  return {
    async findById(departmentId) {
      return clone(departments.get(departmentId));
    },
    async findByCode(code) {
      const upper = (code || "").toUpperCase();
      for (const d of departments.values()) {
        if (d.code === upper) return clone(d);
      }
      return null;
    },
    async create(dept) {
      departments.set(dept.departmentId, structuredClone(dept));
      return clone(dept);
    },
    async update(departmentId, changes) {
      const current = departments.get(departmentId);
      if (!current) return null;
      Object.assign(current, structuredClone(changes));
      return clone(current);
    },
    async search(q = "") {
      const list = [];
      const lower = q.toLowerCase();
      for (const d of departments.values()) {
        if (d.visibleInDirectory === false) continue;
        if (!lower || d.name.toLowerCase().includes(lower) || d.code.toLowerCase().includes(lower)) {
          list.push({
            departmentId: d.departmentId,
            name: d.name,
            code: d.code,
            adminName: d.adminName || "Admin",
          });
        }
      }
      return list;
    },
    async createRequest(req) {
      requests.set(req.requestId, structuredClone(req));
      return clone(req);
    },
    async findRequestById(requestId) {
      return clone(requests.get(requestId));
    },
    async findPendingRequestByUser(userId) {
      for (const r of requests.values()) {
        if (r.userId === userId && r.status === "pending") return clone(r);
      }
      return null;
    },
    async listPendingRequests(departmentId) {
      const items = [];
      for (const r of requests.values()) {
        if (r.departmentId === departmentId && r.status === "pending") {
          items.push({
            requestId: r.requestId,
            userId: r.userId,
            name: r.name,
            email: r.email,
            requestedAt: r.requestedAt,
          });
        }
      }
      return items.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    },
    async updateRequest(requestId, changes) {
      const current = requests.get(requestId);
      if (!current) return null;
      Object.assign(current, structuredClone(changes));
      return clone(current);
    },
    async getPermissions(userId) {
      return permissions.get(userId) || ["download", "upload", "createFolders"];
    },
    async setPermissions(userId, perms) {
      permissions.set(userId, [...perms]);
    },
    async bulkSetPermissions(userIds, perms) {
      for (const id of userIds) {
        permissions.set(id, [...perms]);
      }
      return userIds.length;
    },
  };
}

export function createMemoryShareRepository() {
  const shares = new Map();

  return {
    async findById(linkId) {
      return clone(shares.get(linkId));
    },
    async findByOwner(ownerId) {
      const list = [];
      for (const s of shares.values()) {
        if (s.ownerId === ownerId) list.push(clone(s));
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async create(share) {
      shares.set(share.linkId, structuredClone(share));
      return clone(share);
    },
    async update(linkId, changes) {
      const current = shares.get(linkId);
      if (!current) return null;
      Object.assign(current, structuredClone(changes));
      return clone(current);
    },
    async delete(linkId) {
      shares.delete(linkId);
    },
  };
}

export function createMemoryAuditRepository() {
  const logs = new Map();

  return {
    async record(entry) {
      logs.set(entry.logId, structuredClone(entry));
      return clone(entry);
    },
    async list({ departmentId, userId, action, from, to, page = 1, pageSize = 20 }) {
      let list = Array.from(logs.values());
      if (departmentId) {
        list = list.filter((l) => l.departmentId === departmentId);
      }
      if (userId) {
        list = list.filter((l) => l.userId === userId);
      }
      if (action) {
        list = list.filter((l) => l.action === action);
      }
      if (from) {
        list = list.filter((l) => l.timestamp >= from);
      }
      if (to) {
        const toEnd = to.includes("T") ? to : `${to}T23:59:59.999Z`;
        list = list.filter((l) => l.timestamp <= toEnd);
      }

      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total = list.length;
      const start = (page - 1) * pageSize;
      const items = list.slice(start, start + pageSize).map(clone);

      return { items, page: Number(page), pageSize: Number(pageSize), total };
    },
    async listForUser({ userId, page = 1, pageSize = 20 }) {
      let list = Array.from(logs.values()).filter((l) => l.userId === userId);
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total = list.length;
      const start = (page - 1) * pageSize;
      const items = list.slice(start, start + pageSize).map(clone);

      return { items, page: Number(page), pageSize: Number(pageSize), total };
    },
  };
}

export function createMemoryNotificationRepository() {
  const notifications = new Map();

  return {
    async create(notification) {
      notifications.set(notification.notificationId, structuredClone(notification));
      return clone(notification);
    },
    async listForUser(userId) {
      const list = [];
      let unreadCount = 0;
      for (const n of notifications.values()) {
        if (n.userId === userId) {
          list.push(clone(n));
          if (!n.read) unreadCount++;
        }
      }
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return { items: list, unreadCount };
    },
    async markRead({ userId, ids = [], all = false }) {
      const targetIds = new Set(ids);
      for (const [id, n] of notifications.entries()) {
        if (n.userId === userId) {
          if (all || targetIds.has(id)) {
            n.read = true;
          }
        }
      }
      let unreadCount = 0;
      for (const n of notifications.values()) {
        if (n.userId === userId && !n.read) unreadCount++;
      }
      return { unreadCount };
    },
  };
}
