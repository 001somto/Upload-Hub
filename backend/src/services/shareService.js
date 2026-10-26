// services/shareService.js
// Business rules for creating, listing, revoking, and opening public share links.

import crypto from "crypto";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

function getLinkStatus(link) {
  if (link.status === "revoked") return "revoked";
  if (new Date(link.expiresAt) <= new Date()) return "expired";
  return "active";
}

export function createShareService({ shares, files, folders, storage, auditService, notificationService, config }) {
  return {
    async listLinks({ user }) {
      const all = await shares.findByOwner(user.userId);
      const items = all.map((s) => ({
        linkId: s.linkId,
        targetType: s.targetType,
        targetId: s.targetId,
        targetName: s.targetName,
        url: `${config.frontendUrl}/share/${s.linkId}`,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        status: getLinkStatus(s),
      }));
      return { items };
    },

    async createLink({ user, targetType, targetId, expiresInDays, expiresAt }) {
      if (!["file", "folder"].includes(targetType)) {
        throw badRequest("Target type must be 'file' or 'folder'.");
      }
      if (!targetId) throw badRequest("targetId is required.");

      let targetName = "";
      if (targetType === "file") {
        const file = await files.findById(targetId);
        if (!file) throw notFound("File not found.");
        targetName = file.name;
      } else {
        const folder = await folders.findById(targetId);
        if (!folder) throw notFound("Folder not found.");
        targetName = folder.name;
      }

      let expirationDate;
      if (expiresAt) {
        expirationDate = new Date(expiresAt);
      } else {
        const days = Number(expiresInDays || 7);
        expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      const linkId = crypto.randomBytes(16).toString("hex");
      const record = {
        linkId,
        ownerId: user.userId,
        targetType,
        targetId,
        targetName,
        createdAt: new Date().toISOString(),
        expiresAt: expirationDate.toISOString(),
        status: "active",
      };

      await shares.create(record);
      if (auditService) {
        auditService.record({
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          departmentId: user.departmentId,
          action: "share.created",
          target: targetName,
        });
      }

      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "share",
          message: `Share link created for "${targetName}".`,
        });
      }

      return {
        link: {
          ...record,
          url: `${config.frontendUrl}/share/${linkId}`,
          status: "active",
        },
      };
    },

    async revokeLink({ user, linkId }) {
      const link = await shares.findById(linkId);
      if (!link) throw notFound("Link not found.");
      if (link.ownerId !== user.userId && user.role !== "admin") {
        throw forbidden("You can only revoke your own share links.");
      }

      const updated = await shares.update(linkId, { status: "revoked" });
      if (auditService) {
        auditService.record({
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          departmentId: user.departmentId,
          action: "share.revoked",
          target: link.targetName,
        });
      }

      if (notificationService) {
        notificationService.send({
          userId: user.userId,
          type: "share",
          message: `Share link for "${link.targetName}" was revoked.`,
        });
      }
      return {
        link: {
          ...updated,
          url: `${config.frontendUrl}/share/${linkId}`,
          status: "revoked",
        },
      };
    },

    async openLink({ linkId, user }) {
      const link = await shares.findById(linkId);
      if (!link) {
        return { state: "notFound" };
      }

      if (link.status === "revoked") {
        return { state: "revoked", targetType: link.targetType, name: link.targetName };
      }

      if (new Date(link.expiresAt) <= new Date()) {
        return { state: "expired", targetType: link.targetType, name: link.targetName };
      }

      if (link.targetType === "folder") {
        if (!user) {
          return { state: "requiresSignIn", targetType: "folder", name: link.targetName };
        }
        return { state: "active", targetType: "folder", name: link.targetName };
      }

      // File link
      const file = await files.findById(link.targetId);
      if (!file) {
        return { state: "notFound" };
      }

      const { url } = await storage.createDownloadUrl({ s3Key: file.s3Key, fileName: file.name });

      // Notify the file owner when someone (other than themselves) accesses their share link
      if (notificationService && link.ownerId && user && user.userId !== link.ownerId) {
        notificationService.send({
          userId: link.ownerId,
          type: "share",
          message: `${user.name || "Someone"} accessed your shared file "${file.name}" via a share link.`,
        });
      }

      return {
        state: "active",
        targetType: "file",
        name: file.name,
        contentType: file.contentType,
        size: file.size,
        downloadUrl: url,
      };
    },
  };
}
