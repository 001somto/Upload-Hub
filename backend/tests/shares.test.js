// tests/shares.test.js
// Tests for public and authenticated file/folder share links.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMemoryFileRepository,
  createMemoryFolderRepository,
  createMemoryShareRepository,
} from "../src/repositories/memoryRepositories.js";
import { createShareService } from "../src/services/shareService.js";
import { createS3StorageGateway } from "../src/gateways/storageGateway.js";

const testConfig = {
  port: 4000,
  frontendUrl: "http://localhost:5173",
  storageMode: "memory",
  s3: { bucket: "test-bucket", region: "us-east-1" },
};

function setup() {
  const shares = createMemoryShareRepository();
  const files = createMemoryFileRepository();
  const folders = createMemoryFolderRepository();
  const storage = createS3StorageGateway({ config: testConfig });
  const shareService = createShareService({ shares, files, folders, storage, config: testConfig });

  const testUser = {
    userId: "user-1",
    name: "Ada Obi",
    email: "ada@example.com",
    role: "user",
  };

  return { shareService, shares, files, folders, testUser };
}

test("shares: create, list, and open a public file share link", async () => {
  const { shareService, files, testUser } = setup();

  // Create a file
  const file = await files.create({
    fileId: "file-123",
    name: "syllabus.pdf",
    size: 54321,
    contentType: "application/pdf",
    s3Key: "uploads/syllabus.pdf",
    ownerId: testUser.userId,
    ownerName: testUser.name,
    uploadedAt: new Date().toISOString(),
  });

  // Create share link for 7 days
  const { link } = await shareService.createLink({
    user: testUser,
    targetType: "file",
    targetId: file.fileId,
    expiresInDays: 7,
  });

  assert.ok(link.linkId);
  assert.equal(link.targetName, "syllabus.pdf");
  assert.equal(link.status, "active");
  assert.ok(link.url.includes(`/share/${link.linkId}`));

  // List links
  const list = await shareService.listLinks({ user: testUser });
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].linkId, link.linkId);

  // Open link as public visitor (no user)
  const opened = await shareService.openLink({ linkId: link.linkId, user: null });
  assert.equal(opened.state, "active");
  assert.equal(opened.name, "syllabus.pdf");
  assert.equal(opened.size, 54321);
  assert.ok(opened.downloadUrl);
});

test("shares: folder link requires sign-in for unauthenticated visitors", async () => {
  const { shareService, folders, testUser } = setup();

  const folder = await folders.create({
    folderId: "folder-456",
    name: "Lecture Slides",
    ownerId: testUser.userId,
    createdAt: new Date().toISOString(),
  });

  const { link } = await shareService.createLink({
    user: testUser,
    targetType: "folder",
    targetId: folder.folderId,
    expiresInDays: 3,
  });

  // Open without sign-in
  const guestOpen = await shareService.openLink({ linkId: link.linkId, user: null });
  assert.equal(guestOpen.state, "requiresSignIn");
  assert.equal(guestOpen.targetType, "folder");

  // Open with sign-in
  const memberOpen = await shareService.openLink({ linkId: link.linkId, user: testUser });
  assert.equal(memberOpen.state, "active");
  assert.equal(memberOpen.targetType, "folder");
});

test("shares: revoked and expired links give accurate state", async () => {
  const { shareService, files, testUser } = setup();

  const file = await files.create({
    fileId: "file-789",
    name: "test.txt",
    size: 10,
    contentType: "text/plain",
    s3Key: "uploads/test.txt",
    ownerId: testUser.userId,
    uploadedAt: new Date().toISOString(),
  });

  // 1. Revocation
  const { link: revokableLink } = await shareService.createLink({
    user: testUser,
    targetType: "file",
    targetId: file.fileId,
    expiresInDays: 1,
  });
  await shareService.revokeLink({ user: testUser, linkId: revokableLink.linkId });

  const revokedOpen = await shareService.openLink({ linkId: revokableLink.linkId, user: null });
  assert.equal(revokedOpen.state, "revoked");

  // 2. Expiration (past date)
  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
  const { link: expiredLink } = await shareService.createLink({
    user: testUser,
    targetType: "file",
    targetId: file.fileId,
    expiresAt: pastDate,
  });

  const expiredOpen = await shareService.openLink({ linkId: expiredLink.linkId, user: null });
  assert.equal(expiredOpen.state, "expired");

  // 3. Unknown link
  const notFoundOpen = await shareService.openLink({ linkId: "nonexistent-id", user: null });
  assert.equal(notFoundOpen.state, "notFound");
});
