// controllers/notificationController.js
// Handles notification endpoints.

export function createNotificationController(notificationService, snsService) {
  return {
    async list(req, res) {
      const data = await notificationService.list({ user: req.user });
      res.json({ data });
    },

    async markRead(req, res) {
      const { ids, all } = req.body || {};
      const data = await notificationService.markRead({
        user: req.user,
        ids,
        all,
      });
      res.json({ data });
    },

    async snsStatus(req, res) {
      const enabled = Boolean(snsService && typeof snsService.isEnabled === "function" && snsService.isEnabled());
      const topicArn = enabled ? snsService.getTopicArn() : null;
      res.json({ data: { enabled, topicArn } });
    },

    async snsSubscribe(req, res) {
      if (!snsService || !snsService.isEnabled || !snsService.isEnabled()) {
        return res.status(503).json({ error: { code: "SNS_NOT_CONFIGURED", message: "Amazon SNS is not configured on this server." } });
      }
      const result = await snsService.subscribeUser({ userId: req.user.userId, email: req.user.email });
      res.json({
        data: {
          ok: true,
          result,
          message: "A verification email has been sent by AWS Notifications to your email address. Please click the confirmation link in the email to start receiving activity alerts.",
        },
      });
    },
  };
}
