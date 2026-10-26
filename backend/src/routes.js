// routes.js
// Connects API endpoints to controllers.

import { Router } from "express";
import { asyncHandler as wrap } from "./utils/asyncHandler.js";
import { createRateLimiter } from "./middleware/rateLimit.js";

export function createRoutes({
  authController,
  userController,
  fileController,
  storageController,
  departmentController,
  shareController,
  auditController,
  notificationController,
  authenticate,
  optionalAuthenticate,
  config,
}) {
  const router = Router();
  const enabled = config.rateLimit;
  const signInLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, enabled });
  const signUpLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20, enabled });
  const resetLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, enabled });

  router.get("/health", (req, res) => res.json({ data: { status: "ok" } }));

  // ----- Accounts (public) -----
  router.post("/auth/register/user", signUpLimit, wrap(authController.registerUser));
  router.post("/auth/register/admin", signUpLimit, wrap(authController.registerAdmin));
  router.post("/auth/login", signInLimit, wrap(authController.login));
  router.post("/auth/forgot-password", resetLimit, wrap(authController.forgotPassword));
  router.post("/auth/reset-password", resetLimit, wrap(authController.resetPassword));

  // ----- My profile (signed in) -----
  router.get("/users/me", authenticate, wrap(userController.me));
  router.patch("/users/me", authenticate, wrap(userController.updateMe));
  router.post("/users/me/password", authenticate, wrap(userController.changePassword));
  router.post("/users/me/photo-upload-url", authenticate, wrap(userController.photoUploadUrl));

  // ----- Files & Folders (signed in) -----
  if (fileController) {
    router.get("/files", authenticate, wrap(fileController.list));
    router.post("/folders", authenticate, wrap(fileController.createFolder));
    router.patch("/files/:fileId", authenticate, wrap(fileController.renameFile));
    router.patch("/folders/:folderId", authenticate, wrap(fileController.renameFolder));
    router.post("/items/move", authenticate, wrap(fileController.move));
    router.post("/items/delete", authenticate, wrap(fileController.remove));
    router.post("/files/upload-url", authenticate, wrap(fileController.uploadUrl));
    router.post("/files/confirm-upload", authenticate, wrap(fileController.confirmUpload));
    router.get("/files/:fileId/download-url", authenticate, wrap(fileController.downloadUrl));
    router.get("/files/:fileId/preview-url", authenticate, wrap(fileController.previewUrl));
  }

  // ----- Storage Numbers & Media -----
  if (storageController) {
    router.get("/storage/me", authenticate, wrap(storageController.me));
    router.get("/storage/department", authenticate, wrap(storageController.department));
    router.put("/storage/local-upload", wrap(storageController.localUpload));
    router.get("/storage/local-download", wrap(storageController.localDownload));
    router.get("/storage/photo", wrap(storageController.photo));
  }

  // ----- Departments & Memberships -----
  if (departmentController) {
    router.get("/departments", authenticate, wrap(departmentController.searchDepartments));
    router.get("/membership/me", authenticate, wrap(departmentController.getMembership));
    router.post("/membership/requests", authenticate, wrap(departmentController.requestToJoin));
    router.post("/membership/me/cancel", authenticate, wrap(departmentController.cancelRequest));
    router.post("/membership/me/leave", authenticate, wrap(departmentController.leave));

    // Admin Department Management
    router.get("/department/members", authenticate, wrap(departmentController.members));
    router.get("/department/requests", authenticate, wrap(departmentController.requests));
    router.post("/department/requests/:requestId/:decision", authenticate, wrap(departmentController.decideRequest));
    router.post("/department/members/:userId/remove", authenticate, wrap(departmentController.removeMember));
    router.post("/department/members/:userId/:status", authenticate, wrap(departmentController.setMemberStatus));
    router.put("/department/members/:userId/permissions", authenticate, wrap(departmentController.setPermissions));
    router.post("/department/members/permissions/bulk", authenticate, wrap(departmentController.bulkPermissions));
    router.get("/department/settings", authenticate, wrap(departmentController.settings));
    router.patch("/department/settings", authenticate, wrap(departmentController.updateSettings));
  }

  // ----- Public & Signed-in Share Links -----
  if (shareController) {
    router.get("/share-links", authenticate, wrap(shareController.list));
    router.post("/share-links", authenticate, wrap(shareController.create));
    router.post("/share-links/:linkId/revoke", authenticate, wrap(shareController.revoke));
    router.get("/share/:linkId", optionalAuthenticate || ((req, res, next) => next()), wrap(shareController.open));
  }

  // ----- Audit Trail & User Activity -----
  if (auditController) {
    router.get("/audit", authenticate, wrap(auditController.listDepartmentAudit));
    router.get("/activity/me", authenticate, wrap(auditController.listMyActivity));
  }

  // ----- In-App Notifications -----
  if (notificationController) {
    router.get("/notifications", authenticate, wrap(notificationController.list));
    router.post("/notifications/read", authenticate, wrap(notificationController.markRead));
    router.get("/notifications/sns", authenticate, wrap(notificationController.snsStatus));
    router.post("/notifications/sns/subscribe", authenticate, wrap(notificationController.snsSubscribe));
  }

  return router;
}
