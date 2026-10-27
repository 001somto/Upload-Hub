// gateways/storageGateway.js
// Storage gateway supporting AWS S3 and local development fallback.

import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  DeleteObjectsCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client } from "../db/s3Client.js";

function getExtension(nameOrType) {
  if (nameOrType.includes("/")) {
    if (nameOrType.includes("png")) return "png";
    if (nameOrType.includes("jpeg") || nameOrType.includes("jpg")) return "jpg";
    if (nameOrType.includes("webp")) return "webp";
    if (nameOrType.includes("pdf")) return "pdf";
    return "bin";
  }
  const ext = path.extname(nameOrType).replace(/^\./, "");
  return ext || "bin";
}

export function createNoStorageGateway() {
  return {
    isLocalFallback: true,
    photoUrl: () => null,
    createPhotoUpload: null,
  };
}

export function createS3StorageGateway({ config, localFallbackDir = null }) {
  const { s3 } = config;
  const isLocalFallback = config.storageMode === "memory" && !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI && !process.env.AWS_PROFILE;
  
  let s3Client = null;
  if (!isLocalFallback && s3) {
    try {
      s3Client = createS3Client(s3);
    } catch {
      s3Client = null;
    }
  }

  const uploadDir = localFallbackDir || path.resolve(process.cwd(), "data", "uploads");
  if (isLocalFallback) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch {}
  }

  const apiBase = (config.apiBaseUrl || (config.production ? "https://api.uploadhub.work.gd" : `http://localhost:${config.port}`)).replace(/\/+$/, "");

  return {
    isLocalFallback,
    uploadDir,

    // Profile photo viewing link (synchronous helper used by publicUser)
    photoUrl(key) {
      if (!key) return null;
      return `${apiBase}/api/storage/photo?key=${encodeURIComponent(key)}`;
    },

    // Direct stream for profile photos
    async getObjectStream(s3Key) {
      if (isLocalFallback || !s3Client) {
        const targetPath = path.join(uploadDir, s3Key);
        if (!fs.existsSync(targetPath)) return null;
        return {
          stream: fs.createReadStream(targetPath),
          contentType: "image/jpeg",
        };
      }
      try {
        const command = new GetObjectCommand({
          Bucket: s3.bucket,
          Key: s3Key,
        });
        const response = await s3Client.send(command);
        return {
          stream: response.Body,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        };
      } catch {
        return null;
      }
    },

    // Presigned upload URL for a profile photo
    async createPhotoUpload({ userId, contentType, size }) {
      const ext = getExtension(contentType);
      const photoKey = `profile-photos/${userId}/${crypto.randomUUID()}.${ext}`;

      if (isLocalFallback || !s3Client) {
        return {
          uploadUrl: `${apiBase}/api/storage/local-upload?key=${encodeURIComponent(photoKey)}`,
          photoKey,
          headers: { "Content-Type": contentType },
        };
      }

      const command = new PutObjectCommand({
        Bucket: s3.bucket,
        Key: photoKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      return {
        uploadUrl,
        photoKey,
        headers: { "Content-Type": contentType },
      };
    },

    // Presigned upload URL for general files
    async createFileUpload({ userId, fileId, name, contentType, size, scope, departmentId }) {
      const ext = getExtension(name);
      const s3Key = `uploads/${scope}/${scope === "department" ? departmentId : userId}/${fileId}/${name}`;

      if (isLocalFallback || !s3Client) {
        return {
          uploadUrl: `${apiBase}/api/storage/local-upload?key=${encodeURIComponent(s3Key)}`,
          s3Key,
          headers: { "Content-Type": contentType || "application/octet-stream" },
        };
      }

      const command = new PutObjectCommand({
        Bucket: s3.bucket,
        Key: s3Key,
        ContentType: contentType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      return {
        uploadUrl,
        s3Key,
        headers: { "Content-Type": contentType || "application/octet-stream" },
      };
    },

    // Presigned download URL
    async createDownloadUrl({ s3Key, fileName }) {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      if (isLocalFallback || !s3Client) {
        return {
          url: `${apiBase}/api/storage/local-download?key=${encodeURIComponent(s3Key)}&filename=${encodeURIComponent(fileName)}`,
          expiresAt,
        };
      }

      const command = new GetObjectCommand({
        Bucket: s3.bucket,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return { url, expiresAt };
    },

    // Presigned preview URL
    async createPreviewUrl({ s3Key, fileName, contentType }) {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      if (isLocalFallback || !s3Client) {
        return {
          url: `${apiBase}/api/storage/local-download?key=${encodeURIComponent(s3Key)}&inline=true`,
          expiresAt,
          contentType,
        };
      }

      const command = new GetObjectCommand({
        Bucket: s3.bucket,
        Key: s3Key,
        ResponseContentDisposition: "inline",
        ResponseContentType: contentType || undefined,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return { url, expiresAt, contentType };
    },

    // Delete one or multiple objects
    async deleteObjects(s3Keys) {
      const validKeys = s3Keys.filter(Boolean);
      if (validKeys.length === 0) return;

      if (isLocalFallback || !s3Client) {
        for (const key of validKeys) {
          const filePath = path.join(uploadDir, key);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch {}
        }
        return;
      }

      if (validKeys.length === 1) {
        await s3Client.send(new DeleteObjectCommand({ Bucket: s3.bucket, Key: validKeys[0] }));
      } else {
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: s3.bucket,
            Delete: { Objects: validKeys.map((Key) => ({ Key })) },
          })
        );
      }
    },

    // Streams an object directly from storage (S3 or local disk)
    async getObjectStream(key) {
      if (isLocalFallback || !s3Client) {
        const filePath = path.join(uploadDir, key);
        if (!fs.existsSync(filePath)) return null;
        return {
          stream: fs.createReadStream(filePath),
          contentType: getExtension(key) === "png" ? "image/png" : "image/jpeg",
          contentLength: fs.statSync(filePath).size,
        };
      }

      try {
        const command = new GetObjectCommand({
          Bucket: s3.bucket,
          Key: key,
        });
        const res = await s3Client.send(command);
        return {
          stream: res.Body,
          contentType: res.ContentType || "image/jpeg",
          contentLength: res.ContentLength,
        };
      } catch (err) {
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
        throw err;
      }
    },
  };
}
