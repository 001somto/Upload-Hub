// config/env.js
// WHAT THIS FILE IS: reads the settings from the ".env" file and checks them.
// WHAT IT DOES: gives the rest of the code one tidy "config" object. If a required setting
// is missing or unsafe, the server refuses to start and says why (better than failing later).

import "dotenv/config";

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const production = nodeEnv === "production";

  const jwtSecret = env.JWT_SECRET || "";
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short. Set a random value of 32+ characters in backend/.env (see .env.example).");
  }
  if (production && /replace-this/i.test(jwtSecret)) {
    throw new Error("JWT_SECRET is still the example value. Set a real secret before running in production.");
  }

  const sessionHours = Number(env.SESSION_HOURS || 8);
  if (!Number.isFinite(sessionHours) || sessionHours <= 0 || sessionHours > 72) {
    throw new Error("SESSION_HOURS must be a number between 1 and 72.");
  }

  const storageMode = env.STORAGE_MODE || "dynamo";
  if (!["dynamo", "memory"].includes(storageMode)) throw new Error('STORAGE_MODE must be "dynamo" or "memory".');
  if (production && storageMode === "memory") throw new Error('STORAGE_MODE "memory" is not allowed in production.');

  const emailMode = env.EMAIL_MODE || "none";
  if (!["console", "none"].includes(emailMode)) throw new Error('EMAIL_MODE must be "console" or "none".');
  if (production && emailMode === "console") throw new Error('EMAIL_MODE "console" is for development only.');

  return {
    nodeEnv,
    production,
    port: Number(env.PORT || 4000),
    jwtSecret,
    sessionHours,
    corsOrigins: (env.CORS_ORIGINS || "http://localhost:5173,https://www.uploadhub.work.gd,https://uploadhub.work.gd,http://localhost:4000,http://127.0.0.1:5173").split(",").map((item) => item.trim()).filter(Boolean),
    frontendUrl: (env.FRONTEND_URL || (production ? "https://www.uploadhub.work.gd" : "http://localhost:5173")).replace(/\/+$/, ""),
    trustProxy: env.TRUST_PROXY === "true",
    storageMode,
    emailMode,
    aws: {
      region: env.AWS_REGION || "eu-west-1",
      endpoint: env.DYNAMODB_ENDPOINT || "",
      usersTable: env.USERS_TABLE || "UploadHub_Users",
      resetTokensTable: env.RESET_TOKENS_TABLE || "UploadHub_PasswordResets",
      filesTable: env.FILES_TABLE || "UploadHub_Files",
      foldersTable: env.FOLDERS_TABLE || "UploadHub_Folders",
      departmentsTable: env.DEPARTMENTS_TABLE || "UploadHub_Departments",
      sharesTable: env.SHARES_TABLE || "UploadHub_Shares",
      notificationsTable: env.NOTIFICATIONS_TABLE || "UploadHub_Notifications",
      auditTable: env.AUDIT_TABLE || "UploadHub_Audit",
      snsTopicArn: env.SNS_TOPIC_ARN || "",
    },
    s3: {
      bucket: env.S3_BUCKET || "uploadhub-storage-project-191224341652-eu-west-1-an",
      region: env.AWS_REGION || "eu-west-1",
      endpoint: env.S3_ENDPOINT || "",
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    },
    storageLimits: {
      userLimitBytes: Number(env.USER_STORAGE_LIMIT_BYTES || 1024 * 1024 * 1024),
      adminLimitBytes: Number(env.ADMIN_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024 * 1024),
      maxFileSizeBytes: Number(env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024),
    },
    rateLimit: true,
  };
}
