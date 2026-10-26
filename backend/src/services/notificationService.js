import crypto from "crypto";

export function createNotificationService({ notificationsRepo, snsService }) {
  return {
    async send({ userId, type = "info", message }) {
      if (!userId || !message) return;
      const record = {
        notificationId: crypto.randomUUID(),
        userId,
        type,
        message,
        timestamp: new Date().toISOString(),
        read: false,
      };
      await notificationsRepo.create(record);

      // Asynchronously deliver notification email via Amazon SNS
      if (snsService && typeof snsService.isEnabled === "function" && snsService.isEnabled()) {
        snsService
          .publishNotification({ userId, type, message })
          .catch((err) => console.warn("[SNS notification publish notice]:", err.message));
      }

      return record;
    },

    async list({ user }) {
      const data = await notificationsRepo.listForUser(user.userId);

      if (data.items.length === 0) {
        const welcome = await this.send({
          userId: user.userId,
          type: "welcome",
          message: user.role === "admin"
            ? "Welcome to UploadHub! Your department and admin workspace are ready."
            : "Welcome to UploadHub! Your cloud file storage and workspace are ready.",
        });
        return { items: [welcome], unreadCount: 1 };
      }

      // Deduplicate by message and timestamp so duplicate items never appear in the UI
      const seen = new Set();
      const deduped = [];
      data.items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      for (const item of data.items) {
        const normMsg = item.message
          .replace(/^Your file "(.*)" was uploaded successfully\.$/, 'File "$1" was uploaded successfully.')
          .replace(/^You approved (.*)'s join request\.$/, 'Approved join request for $1.')
          .replace(/^You downloaded "(.*)"\.$/, 'Downloaded "$1".');
        const timeKey = (item.timestamp || "").slice(0, 16);
        const dedupeKey = `${normMsg}|${timeKey}`;

        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          deduped.push(item);
        }
      }

      const unreadCount = deduped.filter((item) => !item.read).length;
      return { items: deduped, unreadCount };
    },

    async markRead({ user, ids, all }) {
      return notificationsRepo.markRead({
        userId: user.userId,
        ids: Array.isArray(ids) ? ids : [],
        all: Boolean(all),
      });
    },
  };
}
