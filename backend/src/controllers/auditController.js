// controllers/auditController.js
// Handles audit log and activity endpoints.

export function createAuditController(auditService) {
  return {
    async listDepartmentAudit(req, res) {
      const { userId, action, from, to, page, pageSize } = req.query;
      const data = await auditService.listDepartmentAudit({
        admin: req.user,
        userId,
        action,
        from,
        to,
        page,
        pageSize,
      });
      res.json({ data });
    },

    async listMyActivity(req, res) {
      const { page, pageSize } = req.query;
      const data = await auditService.listMyActivity({
        user: req.user,
        page,
        pageSize,
      });
      res.json({ data });
    },
  };
}
