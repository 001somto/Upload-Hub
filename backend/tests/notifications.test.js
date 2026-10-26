// tests/notifications.test.js
// Tests for in-app user and admin notifications.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryNotificationRepository } from "../src/repositories/memoryRepositories.js";
import { createNotificationService } from "../src/services/notificationService.js";

function setup() {
  const notificationsRepo = createMemoryNotificationRepository();
  const notificationService = createNotificationService({ notificationsRepo });

  const testUser = {
    userId: "user-abc",
    name: "Emeka",
    role: "user",
  };

  return { notificationService, notificationsRepo, testUser };
}

test("notifications: sends, lists with unread count, and seeds welcome message", async () => {
  const { notificationService, testUser } = setup();

  // First time listing gives welcome notification
  const initial = await notificationService.list({ user: testUser });
  assert.equal(initial.items.length, 1);
  assert.equal(initial.items[0].type, "welcome");
  assert.equal(initial.unreadCount, 1);

  // Send an additional notification
  await notificationService.send({
    userId: testUser.userId,
    type: "upload",
    message: "Your file report.pdf was uploaded successfully.",
  });

  const updated = await notificationService.list({ user: testUser });
  assert.equal(updated.items.length, 2);
  assert.equal(updated.unreadCount, 2);
  assert.equal(updated.items[0].type, "upload"); // newest first
});

test("notifications: marks individual and all notifications as read", async () => {
  const { notificationService, testUser } = setup();

  const notif1 = await notificationService.send({
    userId: testUser.userId,
    type: "info",
    message: "Notification 1",
  });
  const notif2 = await notificationService.send({
    userId: testUser.userId,
    type: "info",
    message: "Notification 2",
  });

  // Mark notif1 as read
  const res1 = await notificationService.markRead({
    user: testUser,
    ids: [notif1.notificationId],
  });
  assert.equal(res1.unreadCount, 1);

  // Mark all as read
  const res2 = await notificationService.markRead({
    user: testUser,
    all: true,
  });
  assert.equal(res2.unreadCount, 0);

  const final = await notificationService.list({ user: testUser });
  assert.equal(final.unreadCount, 0);
  assert.equal(final.items.every((n) => n.read), true);
});
