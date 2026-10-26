// tests/files.test.js
// Tests for file & folder management, upload, download, deduplication, quotas, and deletion.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMemoryFileRepository,
  createMemoryFolderRepository,
  createMemoryUploadSessionRepository,
} from "../src/repositories/memoryRepositories.js";
import { createFileService } from "../src/services/fileService.js";
import { createS3StorageGateway } from "../src/gateways/storageGateway.js";

const testConfig = {
  port: 4000,
  frontendUrl: "http://localhost:5173",
  storageMode: "memory",
  storageLimits: {
    userLimitBytes: 10 * 1024 * 1024, // 10 MB for test
    adminLimitBytes: 50 * 1024 * 1024,
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB max per file
  },
  s3: {
    bucket: "test-bucket",
    region: "us-east-1",
  },
};

function setup() {
  const files = createMemoryFileRepository();
  const folders = createMemoryFolderRepository();
  const uploadSessions = createMemoryUploadSessionRepository();
  const storage = createS3StorageGateway({ config: testConfig });
  const fileService = createFileService({ files, folders, uploadSessions, storage, config: testConfig });

  const testUser = {
    userId: "user-123",
    name: "Ada Obi",
    email: "ada@example.com",
    role: "user",
    departmentId: null,
    membershipState: "independent",
  };

  return { fileService, testUser, files, folders };
}

test("files: lists root folders and files empty initially", async () => {
  const { fileService, testUser } = setup();
  const res = await fileService.listFiles({ user: testUser, scope: "independent" });
  assert.equal(res.folders.length, 0);
  assert.equal(res.files.length, 0);
  assert.equal(res.breadcrumbs.length, 0);
  assert.equal(res.permissions.upload, true);
});

test("files: creates folder and retrieves breadcrumbs", async () => {
  const { fileService, testUser } = setup();
  const folderA = await fileService.createFolder({ user: testUser, name: "Semester 1", scope: "independent" });
  assert.ok(folderA.folderId);
  assert.equal(folderA.name, "Semester 1");

  const folderB = await fileService.createFolder({
    user: testUser,
    name: "Assignments",
    parentFolderId: folderA.folderId,
    scope: "independent",
  });
  assert.equal(folderB.parentFolderId, folderA.folderId);

  const listB = await fileService.listFiles({ user: testUser, scope: "independent", folderId: folderB.folderId });
  assert.equal(listB.breadcrumbs.length, 2);
  assert.equal(listB.breadcrumbs[0].name, "Semester 1");
  assert.equal(listB.breadcrumbs[1].name, "Assignments");
});

test("files: upload flow, deduplication, download, and quota calculation", async () => {
  const { fileService, testUser } = setup();

  // 1. Request upload URL
  const uploadRes = await fileService.requestUploadUrl({
    user: testUser,
    name: "report.pdf",
    size: 1024,
    contentType: "application/pdf",
    scope: "independent",
  });
  assert.ok(uploadRes.uploadId);
  assert.ok(uploadRes.uploadUrl);

  // 2. Confirm upload
  const confirmRes = await fileService.confirmUpload({ user: testUser, uploadId: uploadRes.uploadId });
  assert.equal(confirmRes.file.name, "report.pdf");
  assert.equal(confirmRes.file.size, 1024);

  // 3. Second upload with same name automatically dedupes to 'report (1).pdf'
  const upload2 = await fileService.requestUploadUrl({
    user: testUser,
    name: "report.pdf",
    size: 2048,
    contentType: "application/pdf",
    scope: "independent",
  });
  const confirm2 = await fileService.confirmUpload({ user: testUser, uploadId: upload2.uploadId });
  assert.equal(confirm2.file.name, "report (1).pdf");

  // 4. Download URL
  const dl = await fileService.getDownloadUrl({ user: testUser, fileId: confirmRes.file.fileId });
  assert.ok(dl.url);

  // 5. Preview URL
  const prev = await fileService.getPreviewUrl({ user: testUser, fileId: confirmRes.file.fileId });
  assert.ok(prev.url);
  assert.equal(prev.contentType, "application/pdf");

  // 6. Storage usage stats
  const usage = await fileService.getStorageUsage({ user: testUser });
  assert.equal(usage.fileCount, 2);
  assert.equal(usage.usedBytes, 1024 + 2048);
  assert.equal(usage.byType[0].type, "Documents");
  assert.equal(usage.byType[0].bytes, 3072);
});

test("files: quota exceeded refuses upload", async () => {
  const { fileService, testUser } = setup();
  await assert.rejects(
    async () => {
      await fileService.requestUploadUrl({
        user: testUser,
        name: "huge.zip",
        size: 20 * 1024 * 1024, // 20 MB > 5 MB max
        contentType: "application/zip",
      });
    },
    (err) => err.code === "FILE_TOO_LARGE"
  );
});

test("files: move and delete items", async () => {
  const { fileService, testUser } = setup();

  const folder = await fileService.createFolder({ user: testUser, name: "Archive" });
  const up = await fileService.requestUploadUrl({
    user: testUser,
    name: "photo.png",
    size: 500,
    contentType: "image/png",
  });
  const { file } = await fileService.confirmUpload({ user: testUser, uploadId: up.uploadId });

  // Move into folder
  const moveRes = await fileService.moveItems({
    user: testUser,
    fileIds: [file.fileId],
    targetFolderId: folder.folderId,
  });
  assert.equal(moveRes.moved, 1);

  // Verify in folder
  const folderContents = await fileService.listFiles({ user: testUser, folderId: folder.folderId });
  assert.equal(folderContents.files.length, 1);

  // Delete folder (which recursively removes the file)
  const delRes = await fileService.removeItems({ user: testUser, folderIds: [folder.folderId] });
  assert.equal(delRes.deleted, 2); // 1 folder + 1 file

  const usageAfter = await fileService.getStorageUsage({ user: testUser });
  assert.equal(usageAfter.fileCount, 0);
  assert.equal(usageAfter.usedBytes, 0);
});
