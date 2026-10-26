// controllers/departmentController.js
// Handles HTTP requests for departments and memberships.

export function createDepartmentController(departmentService) {
  return {
    async searchDepartments(req, res) {
      const data = await departmentService.searchDepartments(req.query.q);
      res.json({ data });
    },

    async getMembership(req, res) {
      const data = await departmentService.getMembership(req.user);
      res.json({ data });
    },

    async requestToJoin(req, res) {
      const data = await departmentService.requestToJoin(req.user, req.body || {});
      res.json({ data });
    },

    async cancelRequest(req, res) {
      const data = await departmentService.cancelRequest(req.user);
      res.json({ data });
    },

    async leave(req, res) {
      const data = await departmentService.leaveDepartment(req.user);
      res.json({ data });
    },

    async members(req, res) {
      const data = await departmentService.getMembers(req.user, req.query);
      res.json({ data });
    },

    async requests(req, res) {
      const data = await departmentService.getRequests(req.user);
      res.json({ data });
    },

    async decideRequest(req, res) {
      const { requestId, decision } = req.params;
      const data = await departmentService.decideRequest(req.user, requestId, decision);
      res.json({ data });
    },

    async removeMember(req, res) {
      const { userId } = req.params;
      const data = await departmentService.removeMember(req.user, userId);
      res.json({ data });
    },

    async setMemberStatus(req, res) {
      const { userId, status } = req.params;
      const data = await departmentService.setMemberStatus(req.user, userId, status);
      res.json({ data });
    },

    async setPermissions(req, res) {
      const { userId } = req.params;
      const permissions = req.body && req.body.permissions;
      const data = await departmentService.setPermissions(req.user, userId, permissions);
      res.json({ data });
    },

    async bulkPermissions(req, res) {
      const { userIds, permissions } = req.body || {};
      const data = await departmentService.bulkPermissions(req.user, userIds, permissions);
      res.json({ data });
    },

    async settings(req, res) {
      const data = await departmentService.getSettings(req.user);
      res.json({ data });
    },

    async updateSettings(req, res) {
      const data = await departmentService.updateSettings(req.user, req.body || {});
      res.json({ data });
    },
  };
}
