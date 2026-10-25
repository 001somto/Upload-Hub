// controllers/authController.js
// WHAT THIS FILE IS: the thin layer between web requests and the auth rules.
// WHAT IT DOES: takes the request body, calls the matching auth service function, and sends
// back { data: ... }. Only the fields each endpoint needs are passed on.

export function createAuthController(auth) {
  const body = (req) => (req.body && typeof req.body === "object" ? req.body : {});
  return {
    registerUser: async (req, res) => {
      const { name, email, password } = body(req);
      res.status(201).json({ data: await auth.registerUser({ name, email, password }) });
    },
    registerAdmin: async (req, res) => {
      const { name, email, password, departmentName, departmentCode } = body(req);
      res.status(201).json({ data: await auth.registerAdmin({ name, email, password, departmentName, departmentCode }) });
    },
    login: async (req, res) => {
      const { email, password, expectedRole } = body(req);
      res.json({ data: await auth.login({ email, password, expectedRole }) });
    },
    forgotPassword: async (req, res) => {
      res.json({ data: await auth.forgotPassword({ email: body(req).email }) });
    },
    resetPassword: async (req, res) => {
      const { token, password } = body(req);
      res.json({ data: await auth.resetPassword({ token, password }) });
    },
  };
}
