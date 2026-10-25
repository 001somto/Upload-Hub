// routes.js
// WHAT THIS FILE IS: the list of web addresses (endpoints) this backend answers.
// WHAT IT DOES: connects each address to its controller. Sensitive ones get a speed limit.
// THE TEAMMATE: add your own routers in src/app.js next to this one (see the marked spot).

import { Router } from "express";
import { asyncHandler as wrap } from "./utils/asyncHandler.js";
import { createRateLimiter } from "./middleware/rateLimit.js";

export function createRoutes({ authController, userController, authenticate, config }) {
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

  return router;
}
