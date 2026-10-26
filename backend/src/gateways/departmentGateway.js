// gateways/departmentGateway.js
// Handles department creation during admin registration.

import crypto from "crypto";
import { AppError } from "../utils/errors.js";

export function createNotConnectedDepartmentGateway() {
  return {
    isConnected: () => false,
    async createDepartment() {
      throw new AppError(503, "DEPARTMENT_SERVICE_NOT_CONNECTED", "Admin registration needs the department service, which is not connected yet.");
    },
  };
}

export function createDepartmentGateway(departmentsRepo) {
  return {
    isConnected: () => true,
    async createDepartment({ name, code, adminUserId }) {
      const existing = await departmentsRepo.findByCode(code);
      if (existing) {
        throw new AppError(409, "DEPARTMENT_CODE_TAKEN", "That department code is already in use.");
      }
      const departmentId = crypto.randomUUID();
      await departmentsRepo.create({
        departmentId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        adminUserId,
        visibleInDirectory: true,
        createdAt: new Date().toISOString(),
      });
      return { departmentId };
    },
  };
}
