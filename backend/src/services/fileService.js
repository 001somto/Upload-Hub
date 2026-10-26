// services/fileService.js
// Business rules for files, folders, uploads, and quotas.

import crypto from "crypto";
import { AppError, badRequest, forbidden, notFound } from "../utils/errors.js";
import { deduplicateFileName } from "../utils/fileHelpers.js";

export function createFileService({ files, folders, uploadSessions, storage, auditService, notificationService, users, config }) {
  const { storageLimits } = config;

  function getUserLimit(user) {
    return user.role === "admin" ? storageLimits.adminLimitBytes : storageLimits.userLimitBytes;
  }

  function assertDepartmentAccess(user, scope) {
    if (scope !== "department") return;
    if (!user.departmentId || !["active", "approved"].includes(user.membershipState)) {
      if (user.role !== "admin") {
        throw new AppError(403, "NOT_A_MEMBER", "You must be an active member of the department to access department files.");
      }
    }
  }

  function assertFileAccess(user, file) {
    if (!file) throw notFound("File not found.");
    if (file.scope === "department") {
      assertDepartmentAccess(user, "department");
      if (user.departmentId !== file.departmentId) {
        throw forbidden("You cannot access files from another department.");
      }
    } else {
      if (file.ownerId !== user.userId && user.role !== "admin") {
        throw forbidden("You do not have permission to access this file.");
      }
    }
  }

  function assertFolderAccess(user, folder) {
    if (!folder) throw notFound("Folder not found.");
    if (folder.scope === "department") {
      assertDepartmentAccess(user, "department");
      if (user.departmentId !== folder.departmentId) {
        throw forbidden("You cannot access folders from another department.");
      }
    } else {
      if (folder.ownerId !== user.userId && user.role !== "admin") {
        throw forbidden("You do not have permission to access this folder.");
      }
    }
  }

  return {
    async listFiles({ user, scope = "independent", folderId = null, q = "", sort = "date", order = "desc" }) {
      assertDepartmentAccess(user, scope);

      let currentFolder = null;
      let breadcrumbs = [];
      if (folderId) {
        currentFolder = await folders.findById(folderId);
        assertFolderAccess(user, currentFolder);
        breadcrumbs = await folders.getBreadcrumbs(folderId);
      }

      const folderList = await folders.list({
        scope,
        parentFolderId: folderId,
        ownerId: user.userId,
        departmentId: user.departmentId,
      });

      const fileList = await files.list({
        scope,
        folderId,
        ownerId: user.userId,
        departmentId: user.departmentId,
        q,
        sort,
        order,
      });

      return {
        folder: currentFolder,
        breadcrumbs,
        folders: folderList,
        files: fileList,
        permissions: {
          upload: true,
          download: true,
          share: true,
          createFolders: true,
          manageFiles: true,
        },
      };
    },

    async createFolder({ user, name, parentFolderId = null, scope = "independent" }) {
      assertDepartmentAccess(user, scope);
      if (!name || typeof name !== "string" || !name.trim() || name.length > 100) {
        throw badRequest("Folder name must be between 1 and 100 characters.");
      }

      if (parentFolderId) {
        const parent = await folders.findById(parentFolderId);
        assertFolderAccess(user, parent);
      }

      const folder = {
        folderId: crypto.randomUUID(),
        name: name.trim(),
        parentFolderId: parentFolderId || null,
        scope,
        ownerId: user.userId,
        departmentId: user.departmentId || null,
        createdAt: new Date().toISOString(),
      };

      const created = await folders.create(folder);
      if (auditService) {
        auditService.record({ userId: user.userId, userName: user.name, userRole: user.role, departmentId: user.departmentId, action: "folder.created", target: folder.name });
      }
      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "folder",
          message: `You created the folder "${folder.name}".`,
        });
      }
      return created;
    },

    async renameFolder({ user, folderId, name }) {
      if (!name || typeof name !== "string" || !name.trim() || name.length > 100) {
        throw badRequest("Folder name must be between 1 and 100 characters.");
      }
      const folder = await folders.findById(folderId);
      assertFolderAccess(user, folder);
      const updated = await folders.update(folderId, { name: name.trim() });
      if (auditService) {
        auditService.record({ userId: user.userId, userName: user.name, userRole: user.role, departmentId: user.departmentId, action: "folder.renamed", target: name.trim() });
      }
      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "folder",
          message: `You renamed a folder to "${name.trim()}".`,
        });
      }
      return updated;
    },

    async renameFile({ user, fileId, name }) {
      if (!name || typeof name !== "string" || !name.trim() || name.length > 200) {
        throw badRequest("File name must be between 1 and 200 characters.");
      }
      const file = await files.findById(fileId);
      assertFileAccess(user, file);
      const updated = await files.update(fileId, { name: name.trim() });
      if (auditService) {
        auditService.record({ userId: user.userId, userName: user.name, userRole: user.role, departmentId: user.departmentId, action: "file.renamed", target: name.trim() });
      }
      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "file",
          message: `You renamed a file to "${name.trim()}".`,
        });
      }
      return updated;
    },

    async moveItems({ user, fileIds = [], folderIds = [], targetFolderId = null }) {
      if (targetFolderId) {
        const target = await folders.findById(targetFolderId);
        assertFolderAccess(user, target);
      }

      let count = 0;
      for (const id of fileIds) {
        const f = await files.findById(id);
        if (f) {
          assertFileAccess(user, f);
          await files.update(id, { folderId: targetFolderId || null });
          count++;
        }
      }

      for (const id of folderIds) {
        const f = await folders.findById(id);
        if (f) {
          assertFolderAccess(user, f);
          if (id === targetFolderId) throw badRequest("Cannot move a folder into itself.");
          await folders.update(id, { parentFolderId: targetFolderId || null });
          count++;
        }
      }

      if (notificationService && count > 0) {
        notificationService.send({
          userId: user.userId,
          type: "file",
          message: `You moved ${count} item(s) to a new location.`,
        });
      }
      return { moved: count };
    },

    async removeItems({ user, fileIds = [], folderIds = [] }) {
      let totalDeleted = 0;
      const s3KeysToDelete = [];

      if (fileIds.length > 0) {
        for (const id of fileIds) {
          const f = await files.findById(id);
          if (f) assertFileAccess(user, f);
        }
        const deleted = await files.deleteMany(fileIds);
        totalDeleted += deleted.length;
        deleted.forEach((d) => d.s3Key && s3KeysToDelete.push(d.s3Key));
      }

      if (folderIds.length > 0) {
        for (const id of folderIds) {
          const f = await folders.findById(id);
          if (f) assertFolderAccess(user, f);
        }
        const deletedFolderIds = await folders.deleteMany(folderIds);
        totalDeleted += deletedFolderIds.length;
        const deletedFiles = await files.deleteByFolderIds(deletedFolderIds);
        totalDeleted += deletedFiles.length;
        deletedFiles.forEach((d) => d.s3Key && s3KeysToDelete.push(d.s3Key));
      }

      if (s3KeysToDelete.length > 0) {
        await storage.deleteObjects(s3KeysToDelete);
      }

      if (auditService && totalDeleted > 0) {
        auditService.record({
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          departmentId: user.departmentId,
          action: fileIds.length ? "file.deleted" : "folder.deleted",
          target: `${totalDeleted} item(s)`,
        });
      }

      if (notificationService && totalDeleted > 0) {
        notificationService.send({
          userId: user.userId,
          type: "file",
          message: `You deleted ${totalDeleted} item(s).`,
        });
      }

      return { deleted: totalDeleted };
    },

    async requestUploadUrl({ user, name, size, contentType, folderId = null, scope = "independent" }) {
      assertDepartmentAccess(user, scope);

      if (!name || typeof name !== "string") throw badRequest("File name is required.");
      if (!Number.isInteger(size) || size <= 0) throw badRequest("File size must be greater than 0 bytes.");
      if (size > storageLimits.maxFileSizeBytes) {
        throw new AppError(400, "FILE_TOO_LARGE", `File size exceeds the limit of ${Math.round(storageLimits.maxFileSizeBytes / 1024 / 1024)} MB.`);
      }

      const limit = getUserLimit(user);
      const usage = await files.getStorageUsage(user.userId, limit);
      if (usage.usedBytes + size > limit) {
        throw new AppError(400, "QUOTA_EXCEEDED", "Storage quota exceeded. Free up space or contact your administrator.");
      }

      if (folderId) {
        const folder = await folders.findById(folderId);
        assertFolderAccess(user, folder);
      }

      const existingNames = await files.listNamesInFolder({
        scope,
        folderId,
        ownerId: user.userId,
        departmentId: user.departmentId,
      });

      const finalName = deduplicateFileName(existingNames, name.trim());
      const uploadId = crypto.randomUUID();

      const { uploadUrl, s3Key, headers } = await storage.createFileUpload({
        userId: user.userId,
        fileId: uploadId,
        name: finalName,
        contentType,
        size,
        scope,
        departmentId: user.departmentId,
      });

      await uploadSessions.save({
        uploadId,
        name: finalName,
        size,
        contentType: contentType || "application/octet-stream",
        folderId: folderId || null,
        scope,
        ownerId: user.userId,
        ownerName: user.name,
        departmentId: user.departmentId || null,
        s3Key,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      return { uploadId, uploadUrl, headers };
    },

    async confirmUpload({ user, uploadId }) {
      if (!uploadId) throw badRequest("uploadId is required.");
      const session = await uploadSessions.get(uploadId);
      if (!session) {
        throw new AppError(400, "INVALID_UPLOAD", "Upload session not found or expired. Please try uploading again.");
      }

      if (session.ownerId !== user.userId) {
        throw forbidden("You cannot confirm an upload initiated by another user.");
      }

      const fileRecord = {
        fileId: session.uploadId,
        name: session.name,
        size: session.size,
        contentType: session.contentType,
        s3Key: session.s3Key,
        folderId: session.folderId || null,
        scope: session.scope,
        ownerId: session.ownerId,
        ownerName: session.ownerName,
        departmentId: session.departmentId || null,
        uploadedAt: new Date().toISOString(),
      };

      await files.create(fileRecord);
      await uploadSessions.delete(uploadId);

      if (auditService) {
        auditService.record({
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          departmentId: user.departmentId,
          action: "file.uploaded",
          target: fileRecord.name,
        });
      }

      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "upload",
          message: `Your file "${fileRecord.name}" was uploaded successfully.`,
        });
        // Notify the department admin when a member uploads to department scope
        if (fileRecord.scope === "department" && user.role !== "admin" && users && users.findDepartmentAdmin) {
          const deptAdmin = await users.findDepartmentAdmin(fileRecord.departmentId).catch(() => null);
          if (deptAdmin && deptAdmin.userId !== user.userId) {
            notificationService.send({
              userId: deptAdmin.userId,
              type: "upload",
              message: `${user.name} uploaded "${fileRecord.name}" to the department.`,
            });
          }
        }
      }

      return { file: fileRecord };
    },

    async getDownloadUrl({ user, fileId }) {
      const file = await files.findById(fileId);
      assertFileAccess(user, file);
      const dl = await storage.createDownloadUrl({ s3Key: file.s3Key, fileName: file.name });
      if (auditService) {
        auditService.record({
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          departmentId: user.departmentId,
          action: "file.downloaded",
          target: file.name,
        });
      }
      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "file",
          message: `You downloaded "${file.name}".`,
        });
        // Notify the file owner if someone else downloads their department file
        if (file.ownerId && file.ownerId !== user.userId && file.scope === "department") {
          notificationService.send({
            userId: file.ownerId,
            type: "file",
            message: `${user.name} downloaded your file "${file.name}".`,
          });
        }
      }
      return dl;
    },

    async getPreviewUrl({ user, fileId }) {
      const file = await files.findById(fileId);
      assertFileAccess(user, file);
      return storage.createPreviewUrl({ s3Key: file.s3Key, fileName: file.name, contentType: file.contentType });
    },

    async getStorageUsage({ user }) {
      const limit = getUserLimit(user);
      return files.getStorageUsage(user.userId, limit);
    },

    async getDepartmentStorageUsage({ user, days = 30 }) {
      if (user.role !== "admin") {
        assertDepartmentAccess(user, "department");
      }
      if (!user.departmentId) {
        return {
          usedBytes: 0,
          limitBytes: storageLimits.adminLimitBytes,
          remainingBytes: storageLimits.adminLimitBytes,
          activeMembers: 0,
          recentUploads: [],
          byMember: [],
          trend: [],
        };
      }
      const data = await files.getDepartmentStorageUsage(user.departmentId, days, storageLimits.adminLimitBytes);

      // Active members must NOT count the admin! Only approved non-admin active members.
      if (users && users.listByDepartment) {
        const deptUsers = await users.listByDepartment(user.departmentId);
        const activeNonAdminMembers = deptUsers.filter(
          (u) => u.userId !== user.userId && u.role !== "admin" && u.status !== "disabled" && (u.membershipState || "active") === "active"
        );
        data.activeMembers = activeNonAdminMembers.length;
      } else {
        data.activeMembers = 0;
      }

      return data;
    },
  };
}
