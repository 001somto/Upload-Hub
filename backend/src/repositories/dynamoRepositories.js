// repositories/dynamoRepositories.js
// Saves and loads accounts, files, and folders in DynamoDB.

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { conflict } from "../utils/errors.js";
import { categorizeFile } from "../utils/fileHelpers.js";

const userKey = (userId) => `USER#${userId}`;
const emailKey = (email) => `EMAIL#${email}`;
const strip = (item) => {
  if (!item) return null;
  const { pk, ...rest } = item;
  return rest;
};

export function createDynamoUserRepository(doc, tableName) {
  async function findById(userId) {
    const result = await doc.send(new GetCommand({ TableName: tableName, Key: { pk: userKey(userId) } }));
    return strip(result.Item);
  }

  return {
    findById,

    async create(user) {
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              { Put: { TableName: tableName, Item: { pk: emailKey(user.email), userId: user.userId }, ConditionExpression: "attribute_not_exists(pk)" } },
              { Put: { TableName: tableName, Item: { pk: userKey(user.userId), ...user }, ConditionExpression: "attribute_not_exists(pk)" } },
            ],
          })
        );
      } catch (error) {
        if (error && error.name === "TransactionCanceledException") {
          throw conflict("An account with this email already exists.", { email: "An account with this email already exists." }, "EMAIL_TAKEN");
        }
        throw error;
      }
      return user;
    },

    async findByEmail(email) {
      const lookup = await doc.send(new GetCommand({ TableName: tableName, Key: { pk: emailKey(email) } }));
      return lookup.Item ? findById(lookup.Item.userId) : null;
    },

    async update(userId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      if (parts.length === 0) return findById(userId);
      try {
        const result = await doc.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: userKey(userId) },
            UpdateExpression: `SET ${parts.join(", ")}`,
            ConditionExpression: "attribute_exists(pk)",
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW",
          })
        );
        return strip(result.Attributes);
      } catch (error) {
        if (error && error.name === "ConditionalCheckFailedException") return null;
        throw error;
      }
    },

    async remove(userId) {
      const user = await findById(userId);
      if (!user) return;
      await doc.send(
        new TransactWriteCommand({
          TransactItems: [
            { Delete: { TableName: tableName, Key: { pk: userKey(userId) } } },
            { Delete: { TableName: tableName, Key: { pk: emailKey(user.email) } } },
          ],
        })
      );
    },

    async listByDepartment(departmentId) {
      if (!departmentId) return [];
      const result = await doc.send(new ScanCommand({ TableName: tableName }));
      const items = (result.Items || []).map(strip).filter(Boolean);
      return items.filter((u) => u.departmentId === departmentId && u.userId);
    },
  };
}

export function createDynamoResetTokenRepository(doc, tableName) {
  return {
    async save(record) {
      await doc.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...record, expiresAtEpoch: Math.floor(new Date(record.expiresAt).getTime() / 1000) },
        })
      );
    },
    async consume(tokenHash) {
      const result = await doc.send(new DeleteCommand({ TableName: tableName, Key: { tokenHash }, ReturnValues: "ALL_OLD" }));
      return result.Attributes || null;
    },
  };
}

export function createDynamoUploadSessionRepository(doc, tableName) {
  return {
    async save(session) {
      await doc.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            ...session,
            fileId: `UPLOAD#${session.uploadId}`,
            expiresAtEpoch: Math.floor(new Date(session.expiresAt).getTime() / 1000),
          },
        })
      );
    },
    async get(uploadId) {
      const result = await doc.send(new GetCommand({ TableName: tableName, Key: { fileId: `UPLOAD#${uploadId}` } }));
      if (!result.Item) return null;
      const { fileId, ...rest } = result.Item;
      return rest;
    },
    async delete(uploadId) {
      await doc.send(new DeleteCommand({ TableName: tableName, Key: { fileId: `UPLOAD#${uploadId}` } }));
    },
  };
}

export function createDynamoFolderRepository(doc, tableName) {
  async function findById(folderId) {
    if (!folderId) return null;
    const result = await doc.send(new GetCommand({ TableName: tableName, Key: { folderId } }));
    return result.Item || null;
  }

  async function listAll() {
    const result = await doc.send(new ScanCommand({ TableName: tableName }));
    return result.Items || [];
  }

  return {
    findById,
    async create(folder) {
      await doc.send(new PutCommand({ TableName: tableName, Item: folder }));
      return folder;
    },
    async update(folderId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      if (parts.length === 0) return findById(folderId);

      const result = await doc.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { folderId },
          UpdateExpression: `SET ${parts.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes || null;
    },
    async list({ scope, parentFolderId = null, ownerId, departmentId }) {
      const all = await listAll();
      const filtered = all.filter((f) => {
        if (f.scope !== scope) return false;
        if (scope === "department" && f.departmentId !== departmentId) return false;
        if (scope === "independent" && f.ownerId !== ownerId) return false;
        if ((f.parentFolderId || null) !== (parentFolderId || null)) return false;
        return true;
      });
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },
    async getBreadcrumbs(folderId) {
      if (!folderId) return [];
      const crumbs = [];
      let currentId = folderId;
      const seen = new Set();
      while (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        const f = await findById(currentId);
        if (!f) break;
        crumbs.unshift({ folderId: f.folderId, name: f.name });
        currentId = f.parentFolderId;
      }
      return crumbs;
    },
    async deleteMany(folderIds) {
      const all = await listAll();
      const toDelete = new Set(folderIds);
      let added = true;
      while (added) {
        added = false;
        for (const f of all) {
          if (f.parentFolderId && toDelete.has(f.parentFolderId) && !toDelete.has(f.folderId)) {
            toDelete.add(f.folderId);
            added = true;
          }
        }
      }
      for (const id of toDelete) {
        await doc.send(new DeleteCommand({ TableName: tableName, Key: { folderId: id } }));
      }
      return Array.from(toDelete);
    },
  };
}

export function createDynamoFileRepository(doc, tableName) {
  async function findById(fileId) {
    if (!fileId) return null;
    const result = await doc.send(new GetCommand({ TableName: tableName, Key: { fileId } }));
    return result.Item || null;
  }

  async function listAll() {
    const result = await doc.send(new ScanCommand({ TableName: tableName }));
    return result.Items || [];
  }

  return {
    findById,
    async create(file) {
      await doc.send(new PutCommand({ TableName: tableName, Item: file }));
      return file;
    },
    async update(fileId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      if (parts.length === 0) return findById(fileId);

      const result = await doc.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { fileId },
          UpdateExpression: `SET ${parts.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes || null;
    },
    async list({ scope, folderId = null, ownerId, departmentId, q = "", sort = "date", order = "desc" }) {
      const all = await listAll();
      let items = all.filter((f) => {
        if (f.fileId && f.fileId.startsWith("UPLOAD#")) return false;
        if (f.scope !== scope) return false;
        if (scope === "department" && f.departmentId !== departmentId) return false;
        if (scope === "independent" && f.ownerId !== ownerId) return false;
        if ((f.folderId || null) !== (folderId || null)) return false;
        if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });

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
      const all = await listAll();
      return all
        .filter((f) => {
          if (f.scope !== scope) return false;
          if (scope === "department" && f.departmentId !== departmentId) return false;
          if (scope === "independent" && f.ownerId !== ownerId) return false;
          if ((f.folderId || null) !== (folderId || null)) return false;
          return true;
        })
        .map((f) => f.name);
    },
    async deleteMany(fileIds) {
      const deleted = [];
      for (const id of fileIds) {
        const item = await findById(id);
        if (item) {
          deleted.push(item);
          await doc.send(new DeleteCommand({ TableName: tableName, Key: { fileId: id } }));
        }
      }
      return deleted;
    },
    async deleteByFolderIds(folderIds) {
      const idSet = new Set(folderIds);
      const all = await listAll();
      const toDelete = all.filter((f) => f.folderId && idSet.has(f.folderId));
      for (const f of toDelete) {
        await doc.send(new DeleteCommand({ TableName: tableName, Key: { fileId: f.fileId } }));
      }
      return toDelete;
    },
    async getStorageUsage(userId, limitBytes = 1024 * 1024 * 1024) {
      const all = await listAll();
      let usedBytes = 0;
      let fileCount = 0;
      const userFiles = [];
      const byTypeMap = {};

      for (const f of all) {
        if (f.fileId && f.fileId.startsWith("UPLOAD#")) continue;
        if (f.ownerId === userId && f.scope === "independent") {
          usedBytes += f.size || 0;
          fileCount++;
          userFiles.push(f);
          const cat = categorizeFile(f.name, f.contentType);
          byTypeMap[cat] = (byTypeMap[cat] || 0) + (f.size || 0);
        }
      }

      userFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const recentUploads = userFiles.slice(0, 5);
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
      const all = await listAll();
      let usedBytes = 0;
      let fileCount = 0;
      const deptFiles = [];
      const memberMap = new Map();

      for (const f of all) {
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
      const recentUploads = deptFiles.slice(0, 5);
      const byMember = Array.from(memberMap.values()).sort((a, b) => b.bytes - a.bytes);

      const trend = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
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

export function createDynamoDepartmentRepository(doc, tableName) {
  async function listAll() {
    const result = await doc.send(new ScanCommand({ TableName: tableName }));
    return result.Items || [];
  }

  async function findById(departmentId) {
    if (!departmentId) return null;
    const result = await doc.send(new GetCommand({ TableName: tableName, Key: { departmentId } }));
    return result.Item || null;
  }

  return {
    findById,
    async findByCode(code) {
      const upper = (code || "").toUpperCase();
      const all = await listAll();
      return all.find((d) => d.code === upper && !d.departmentId.startsWith("REQ#")) || null;
    },
    async create(dept) {
      await doc.send(new PutCommand({ TableName: tableName, Item: dept }));
      return dept;
    },
    async update(departmentId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      if (parts.length === 0) return findById(departmentId);

      const result = await doc.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { departmentId },
          UpdateExpression: `SET ${parts.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes || null;
    },
    async search(q = "") {
      const all = await listAll();
      const lower = q.toLowerCase();
      return all
        .filter((d) => {
          if (d.departmentId.startsWith("REQ#") || d.departmentId.startsWith("PERM#")) return false;
          if (d.visibleInDirectory === false) return false;
          if (!lower) return true;
          return (d.name && d.name.toLowerCase().includes(lower)) || (d.code && d.code.toLowerCase().includes(lower));
        })
        .map((d) => ({
          departmentId: d.departmentId,
          name: d.name,
          code: d.code,
          adminName: d.adminName || "Admin",
        }));
    },
    async createRequest(req) {
      const item = { ...req, departmentId: `REQ#${req.requestId}` };
      await doc.send(new PutCommand({ TableName: tableName, Item: item }));
      return req;
    },
    async findRequestById(requestId) {
      const result = await doc.send(new GetCommand({ TableName: tableName, Key: { departmentId: `REQ#${requestId}` } }));
      return result.Item || null;
    },
    async findPendingRequestByUser(userId) {
      const all = await listAll();
      return all.find((r) => r.departmentId && r.departmentId.startsWith("REQ#") && r.userId === userId && r.status === "pending") || null;
    },
    async listPendingRequests(deptId) {
      const all = await listAll();
      return all
        .filter((r) => r.departmentId && r.departmentId.startsWith("REQ#") && r.targetDepartmentId === deptId && r.status === "pending")
        .map((r) => ({
          requestId: r.requestId,
          userId: r.userId,
          name: r.name,
          email: r.email,
          requestedAt: r.requestedAt,
        }))
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    },
    async updateRequest(requestId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      const result = await doc.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { departmentId: `REQ#${requestId}` },
          UpdateExpression: `SET ${parts.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes || null;
    },
    async getPermissions(userId) {
      const result = await doc.send(new GetCommand({ TableName: tableName, Key: { departmentId: `PERM#${userId}` } }));
      return (result.Item && result.Item.permissions) || ["download", "upload", "createFolders"];
    },
    async setPermissions(userId, permissions) {
      await doc.send(
        new PutCommand({
          TableName: tableName,
          Item: { departmentId: `PERM#${userId}`, userId, permissions },
        })
      );
    },
    async bulkSetPermissions(userIds, permissions) {
      for (const id of userIds) {
        await doc.send(
          new PutCommand({
            TableName: tableName,
            Item: { departmentId: `PERM#${id}`, userId: id, permissions },
          })
        );
      }
      return userIds.length;
    },
  };
}

export function createDynamoShareRepository(doc, tableName) {
  async function findById(linkId) {
    if (!linkId) return null;
    const result = await doc.send(new GetCommand({ TableName: tableName, Key: { linkId } }));
    return result.Item || null;
  }

  return {
    findById,
    async findByOwner(ownerId) {
      const result = await doc.send(new ScanCommand({ TableName: tableName }));
      const all = result.Items || [];
      return all
        .filter((s) => s.ownerId === ownerId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async create(share) {
      await doc.send(new PutCommand({ TableName: tableName, Item: share }));
      return share;
    },
    async update(linkId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      if (parts.length === 0) return findById(linkId);

      const result = await doc.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { linkId },
          UpdateExpression: `SET ${parts.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes || null;
    },
    async delete(linkId) {
      await doc.send(new DeleteCommand({ TableName: tableName, Key: { linkId } }));
    },
  };
}

export function createDynamoAuditRepository(doc, tableName) {
  return {
    async record(entry) {
      await doc.send(new PutCommand({ TableName: tableName, Item: entry }));
      return entry;
    },
    async list({ departmentId, userId, action, from, to, page = 1, pageSize = 20 }) {
      const result = await doc.send(new ScanCommand({ TableName: tableName }));
      let all = result.Items || [];

      if (departmentId) {
        all = all.filter((l) => l.departmentId === departmentId);
      }
      if (userId) {
        all = all.filter((l) => l.userId === userId);
      }
      if (action) {
        all = all.filter((l) => l.action === action);
      }
      if (from) {
        all = all.filter((l) => l.timestamp >= from);
      }
      if (to) {
        const toEnd = to.includes("T") ? to : `${to}T23:59:59.999Z`;
        all = all.filter((l) => l.timestamp <= toEnd);
      }

      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total = all.length;
      const start = (page - 1) * pageSize;
      const items = all.slice(start, start + pageSize);

      return { items, page: Number(page), pageSize: Number(pageSize), total };
    },
    async listForUser({ userId, page = 1, pageSize = 20 }) {
      const result = await doc.send(new ScanCommand({ TableName: tableName }));
      let all = (result.Items || []).filter((l) => l.userId === userId);

      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total = all.length;
      const start = (page - 1) * pageSize;
      const items = all.slice(start, start + pageSize);

      return { items, page: Number(page), pageSize: Number(pageSize), total };
    },
  };
}

export function createDynamoNotificationRepository(doc, tableName) {
  return {
    async create(notification) {
      await doc.send(new PutCommand({ TableName: tableName, Item: notification }));
      return notification;
    },
    async listForUser(userId) {
      const result = await doc.send(new ScanCommand({ TableName: tableName }));
      const all = (result.Items || []).filter((n) => n.userId === userId);
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const unreadCount = all.filter((n) => !n.read).length;
      return { items: all, unreadCount };
    },
    async markRead({ userId, ids = [], all = false }) {
      const result = await doc.send(new ScanCommand({ TableName: tableName }));
      const userNotifs = (result.Items || []).filter((n) => n.userId === userId);
      const targetIds = new Set(ids);

      for (const n of userNotifs) {
        if (!n.read && (all || targetIds.has(n.notificationId))) {
          await doc.send(
            new UpdateCommand({
              TableName: tableName,
              Key: { notificationId: n.notificationId },
              UpdateExpression: "SET #r = :v",
              ExpressionAttributeNames: { "#r": "read" },
              ExpressionAttributeValues: { ":v": true },
            })
          );
          n.read = true;
        }
      }
      const unreadCount = userNotifs.filter((n) => !n.read).length;
      return { unreadCount };
    },
  };
}
