// services/tokenService.js
// WHAT THIS FILE IS: makes and checks sign-in tokens (JWT).
// WHAT IT DOES: a token is a signed note saying "this is user X". It lasts SESSION_HOURS.
// It also carries a "token version": when someone changes or resets their password the
// version goes up, which instantly makes every older token (other devices) useless.

import jwt from "jsonwebtoken";

export function createTokenService(config) {
  return {
    sign(user) {
      return jwt.sign({ role: user.role, tv: user.tokenVersion || 0 }, config.jwtSecret, {
        subject: user.userId,
        expiresIn: `${config.sessionHours}h`,
        algorithm: "HS256",
      });
    },
    // Returns { userId, role, tokenVersion } or null if the token is bad or expired.
    verify(token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
        return { userId: payload.sub, role: payload.role, tokenVersion: payload.tv || 0 };
      } catch {
        return null;
      }
    },
  };
}
