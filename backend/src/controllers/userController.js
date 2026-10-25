// controllers/userController.js
// WHAT THIS FILE IS: the thin layer for "my profile" requests.
// WHAT IT DOES: calls the user service for the signed-in person (req.user, set by authenticate).

import { AppError, badRequest } from "../utils/errors.js";

export function createUserController(userService, storage) {
  return {
    me: async (req, res) => {
      res.json({ data: { user: userService.publicUser(req.user) } });
    },
    updateMe: async (req, res) => {
      res.json({ data: { user: await userService.updateProfile(req.user, req.body) } });
    },
    changePassword: async (req, res) => {
      const { currentPassword, newPassword } = req.body && typeof req.body === "object" ? req.body : {};
      res.json({ data: await userService.changePassword(req.user, { currentPassword, newPassword }) });
    },
    // Profile photos are stored in S3 (teammate's part). Without a storage gateway this says so.
    photoUploadUrl: async (req, res) => {
      if (!storage.createPhotoUpload) throw new AppError(501, "NOT_IMPLEMENTED", "Photo upload is not connected to file storage yet.");
      const { contentType, size } = req.body && typeof req.body === "object" ? req.body : {};
      if (!["image/png", "image/jpeg", "image/webp"].includes(contentType) || !Number.isInteger(size) || size <= 0 || size > 5 * 1024 * 1024) {
        throw badRequest("Choose a PNG, JPG or WebP image under 5 MB.");
      }
      res.json({ data: await storage.createPhotoUpload({ userId: req.user.userId, contentType, size }) });
    },
  };
}
