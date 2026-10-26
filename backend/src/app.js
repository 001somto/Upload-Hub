// app.js
// Builds the web server with security headers, CORS, JSON reading, routes, and error handlers.

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createAuthController } from "./controllers/authController.js";
import { createUserController } from "./controllers/userController.js";
import { createFileController } from "./controllers/fileController.js";
import { createStorageController } from "./controllers/storageController.js";
import { createDepartmentController } from "./controllers/departmentController.js";
import { createShareController } from "./controllers/shareController.js";
import { createAuditController } from "./controllers/auditController.js";
import { createNotificationController } from "./controllers/notificationController.js";
import { createDynamoClients } from "./db/dynamoClient.js";
import { createEmailGateway } from "./gateways/emailGateway.js";
import { createDepartmentGateway } from "./gateways/departmentGateway.js";
import { createS3StorageGateway } from "./gateways/storageGateway.js";
import { createAuthenticate, createOptionalAuthenticate } from "./middleware/authenticate.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createRoutes } from "./routes.js";
import { createAuthService } from "./services/authService.js";
import { createTokenService } from "./services/tokenService.js";
import { createUserService } from "./services/userService.js";
import { createFileService } from "./services/fileService.js";
import { createDepartmentService } from "./services/departmentService.js";
import { createShareService } from "./services/shareService.js";
import { createAuditService } from "./services/auditService.js";
import { createNotificationService } from "./services/notificationService.js";
import { createSnsService } from "./services/snsService.js";
import {
  createDynamoResetTokenRepository,
  createDynamoUserRepository,
  createDynamoFileRepository,
  createDynamoFolderRepository,
  createDynamoUploadSessionRepository,
  createDynamoDepartmentRepository,
  createDynamoShareRepository,
  createDynamoAuditRepository,
  createDynamoNotificationRepository,
} from "./repositories/dynamoRepositories.js";
import {
  createMemoryResetTokenRepository,
  createMemoryUserRepository,
  createMemoryFileRepository,
  createMemoryFolderRepository,
  createMemoryUploadSessionRepository,
  createMemoryDepartmentRepository,
  createMemoryShareRepository,
  createMemoryAuditRepository,
  createMemoryNotificationRepository,
} from "./repositories/memoryRepositories.js";

// Builds default dependencies from config
export function buildDependencies(config, overrides = {}) {
  let users;
  let resets;
  let files;
  let folders;
  let uploadSessions;
  let departmentsRepo;
  let sharesRepo;
  let auditRepo;
  let notificationsRepo;

  if (config.storageMode === "memory") {
    users = createMemoryUserRepository();
    resets = createMemoryResetTokenRepository();
    files = createMemoryFileRepository();
    folders = createMemoryFolderRepository();
    uploadSessions = createMemoryUploadSessionRepository();
    departmentsRepo = createMemoryDepartmentRepository();
    sharesRepo = createMemoryShareRepository();
    auditRepo = createMemoryAuditRepository();
    notificationsRepo = createMemoryNotificationRepository();
  } else {
    const { doc } = createDynamoClients(config.aws);
    users = createDynamoUserRepository(doc, config.aws.usersTable);
    resets = createDynamoResetTokenRepository(doc, config.aws.resetTokensTable);
    files = createDynamoFileRepository(doc, config.aws.filesTable);
    folders = createDynamoFolderRepository(doc, config.aws.foldersTable);
    uploadSessions = createDynamoUploadSessionRepository(doc, config.aws.filesTable);
    departmentsRepo = createDynamoDepartmentRepository(doc, config.aws.departmentsTable);
    sharesRepo = createDynamoShareRepository(doc, config.aws.sharesTable);
    auditRepo = createDynamoAuditRepository(doc, config.aws.auditTable);
    notificationsRepo = createDynamoNotificationRepository(doc, config.aws.notificationsTable);
  }

  const storage = overrides.storage || createS3StorageGateway({ config });
  const auditService = overrides.auditService || createAuditService({ auditRepo, users });
  const snsService = overrides.snsService || createSnsService({ config });
  const notificationService = overrides.notificationService || createNotificationService({ notificationsRepo, snsService });
  const fileService = overrides.fileService || createFileService({ files, folders, uploadSessions, storage, auditService, notificationService, users, config });
  const departments = overrides.departments || createDepartmentGateway(departmentsRepo);
  const departmentService = overrides.departmentService || createDepartmentService({ departments: departmentsRepo, users, auditService, notificationService });
  const shareService = overrides.shareService || createShareService({ shares: sharesRepo, files, folders, storage, auditService, notificationService, config });

  return {
    config,
    users,
    resets,
    files,
    folders,
    uploadSessions,
    fileService,
    departments,
    departmentsRepo,
    departmentService,
    sharesRepo,
    shareService,
    auditRepo,
    auditService,
    snsService,
    notificationsRepo,
    notificationService,
    email: createEmailGateway(config.emailMode),
    storage,
    ...overrides,
  };
}

export function createApp(deps) {
  const { config, users } = deps;
  const tokens = createTokenService(config);
  const authenticate = createAuthenticate({ users, tokens });
  const optionalAuthenticate = createOptionalAuthenticate({ users, tokens });
  const auth = createAuthService({ ...deps, tokens, notificationService: deps.notificationService });
  const userService = createUserService({
    users,
    tokens,
    storage: deps.storage,
    notificationService: deps.notificationService,
    auditService: deps.auditService,
  });
  const fileController = deps.fileService ? createFileController(deps.fileService) : null;
  const storageController = deps.fileService && deps.storage ? createStorageController({ fileService: deps.fileService, storage: deps.storage }) : null;
  const departmentController = deps.departmentService ? createDepartmentController(deps.departmentService) : null;
  const shareController = deps.shareService ? createShareController(deps.shareService) : null;
  const auditController = deps.auditService ? createAuditController(deps.auditService) : null;
  const notificationController = deps.notificationService ? createNotificationController(deps.notificationService, deps.snsService) : null;

  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        // In development, automatically allow all localhost and 127.0.0.1 variants/ports
        if (!config.production && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        callback(null, false);
      },
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "100kb" }));

  app.use(
    "/api",
    createRoutes({
      authController: createAuthController(auth),
      userController: createUserController(userService, deps.storage),
      fileController,
      storageController,
      departmentController,
      shareController,
      auditController,
      notificationController,
      authenticate,
      optionalAuthenticate,
      config,
    })
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
