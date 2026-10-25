// app.js
// WHAT THIS FILE IS: builds the web server (without starting it).
// WHAT IT DOES: puts the pieces together: security headers, CORS (which websites may call
// us), JSON reading, the routes, and the error handler. Everything it needs is passed in, so
// tests can use a fake database and the teammate can plug in their own parts.

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createAuthController } from "./controllers/authController.js";
import { createUserController } from "./controllers/userController.js";
import { createDynamoClients } from "./db/dynamoClient.js";
import { createEmailGateway } from "./gateways/emailGateway.js";
import { createNotConnectedDepartmentGateway } from "./gateways/departmentGateway.js";
import { createNoStorageGateway } from "./gateways/storageGateway.js";
import { createAuthenticate } from "./middleware/authenticate.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createRoutes } from "./routes.js";
import { createAuthService } from "./services/authService.js";
import { createTokenService } from "./services/tokenService.js";
import { createUserService } from "./services/userService.js";
import { createDynamoResetTokenRepository, createDynamoUserRepository } from "./repositories/dynamoRepositories.js";
import { createMemoryResetTokenRepository, createMemoryUserRepository } from "./repositories/memoryRepositories.js";

// Builds the default pieces from the config. Anything passed in "overrides" replaces a default.
export function buildDependencies(config, overrides = {}) {
  let users;
  let resets;
  if (config.storageMode === "memory") {
    users = createMemoryUserRepository();
    resets = createMemoryResetTokenRepository();
  } else {
    const { doc } = createDynamoClients(config.aws);
    users = createDynamoUserRepository(doc, config.aws.usersTable);
    resets = createDynamoResetTokenRepository(doc, config.aws.resetTokensTable);
  }
  return {
    config,
    users,
    resets,
    departments: createNotConnectedDepartmentGateway(), // TEAMMATE: replace with the real one
    email: createEmailGateway(config.emailMode),
    storage: createNoStorageGateway(), // TEAMMATE: replace with the S3 one
    ...overrides,
  };
}

export function createApp(deps) {
  const { config, users } = deps;
  const tokens = createTokenService(config);
  const authenticate = createAuthenticate({ users, tokens });
  const auth = createAuthService({ ...deps, tokens });
  const userService = createUserService({ users, tokens, storage: deps.storage });

  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests with no origin (curl, Postman) are fine; browsers must be on the allowed list.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
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
      authenticate,
      config,
    })
  );

  // >>> TEAMMATE: mount your routers here, for example:
  //     app.use("/api", authenticate, departmentRoutes);
  //     (use requireRole("admin") from ./middleware/requireRole.js for Admin-only routes)

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
