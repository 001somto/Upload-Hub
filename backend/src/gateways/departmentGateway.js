// gateways/departmentGateway.js
// WHAT THIS FILE IS: the doorway between accounts (this part) and departments (teammate's part).
// WHAT IT DOES: Admin sign-up must create a department. That belongs to the backend teammate,
// so this file only defines the doorway. Until the teammate plugs in a real one, it answers
// "department service not connected" (HTTP 503) and Admin sign-up stops cleanly, creating
// nothing. No fake department is ever made.
//
// HOW THE TEAMMATE PLUGS IN: pass your own gateway to createApp({ departments: myGateway })
// in src/server.js. It needs two functions:
//   isConnected() -> true
//   createDepartment({ name, code, adminUserId }) -> { departmentId }
//     (throw AppError 409 code "DEPARTMENT_CODE_TAKEN" when the code is already used)

import { AppError } from "../utils/errors.js";

export function createNotConnectedDepartmentGateway() {
  return {
    isConnected: () => false,
    async createDepartment() {
      throw new AppError(503, "DEPARTMENT_SERVICE_NOT_CONNECTED", "Admin registration needs the department service, which is not connected yet.");
    },
  };
}
