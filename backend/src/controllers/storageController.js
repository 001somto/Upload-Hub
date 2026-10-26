// controllers/storageController.js
// Handles storage statistics and local storage endpoints.

import fs from "fs";
import path from "path";
import { badRequest, notFound } from "../utils/errors.js";

export function createStorageController({ fileService, storage }) {
  return {
    async me(req, res) {
      const data = await fileService.getStorageUsage({ user: req.user });
      res.json({ data });
    },

    async department(req, res) {
      const days = Number(req.query.days || 30);
      const data = await fileService.getDepartmentStorageUsage({ user: req.user, days });
      res.json({ data });
    },

    // Handles direct uploads in local fallback mode
    async localUpload(req, res) {
      const key = req.query.key;
      if (!key) throw badRequest("Missing key parameter.");

      const targetPath = path.join(storage.uploadDir, key);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      const writeStream = fs.createWriteStream(targetPath);
      req.pipe(writeStream);

      writeStream.on("finish", () => {
        res.status(200).send();
      });

      writeStream.on("error", (err) => {
        res.status(500).json({ error: { message: err.message } });
      });
    },

    // Handles downloads in local fallback mode
    async localDownload(req, res) {
      const { key, filename, inline } = req.query;
      if (!key) throw badRequest("Missing key parameter.");

      const targetPath = path.join(storage.uploadDir, key);
      if (!fs.existsSync(targetPath)) throw notFound("File not found on disk.");

      if (inline === "true") {
        res.setHeader("Content-Disposition", "inline");
      } else if (filename) {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      }

      fs.createReadStream(targetPath).pipe(res);
    },

    // Serves profile photo directly from storage with cross-origin headers
    async photo(req, res) {
      const { key } = req.query;
      if (!key) throw badRequest("Missing key parameter.");

      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=86400");

      if (storage.getObjectStream) {
        const result = await storage.getObjectStream(key);
        if (!result) return res.status(404).send("Not found");
        res.setHeader("Content-Type", result.contentType || "image/jpeg");
        if (result.contentLength) res.setHeader("Content-Length", result.contentLength);
        return result.stream.pipe(res);
      }

      if (storage.isLocalFallback) {
        const targetPath = path.join(storage.uploadDir, key);
        if (!fs.existsSync(targetPath)) return res.status(404).send("Not found");
        res.setHeader("Content-Type", "image/jpeg");
        return fs.createReadStream(targetPath).pipe(res);
      }

      const { url } = await storage.createPreviewUrl({ s3Key: key, fileName: "photo" });
      res.redirect(302, url);
    },
  };
}
