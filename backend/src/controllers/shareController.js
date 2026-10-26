// controllers/shareController.js
// Handles share link requests.

export function createShareController(shareService) {
  return {
    async list(req, res) {
      const data = await shareService.listLinks({ user: req.user });
      res.json({ data });
    },

    async create(req, res) {
      const { targetType, targetId, expiresInDays, expiresAt } = req.body || {};
      const data = await shareService.createLink({
        user: req.user,
        targetType,
        targetId,
        expiresInDays,
        expiresAt,
      });
      res.status(201).json({ data });
    },

    async revoke(req, res) {
      const { linkId } = req.params;
      const data = await shareService.revokeLink({ user: req.user, linkId });
      res.json({ data });
    },

    async open(req, res) {
      const { linkId } = req.params;
      const data = await shareService.openLink({ linkId, user: req.user });
      res.json({ data });
    },
  };
}
