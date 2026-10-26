// controllers/fileController.js
// Handles HTTP requests for files and folders.

export function createFileController(fileService) {
  return {
    async list(req, res) {
      const { scope, folderId, q, sort, order } = req.query;
      const data = await fileService.listFiles({
        user: req.user,
        scope: scope || "independent",
        folderId: folderId || null,
        q: q || "",
        sort: sort || "date",
        order: order || "desc",
      });
      res.json({ data });
    },

    async createFolder(req, res) {
      const { name, parentFolderId, scope } = req.body || {};
      const folder = await fileService.createFolder({
        user: req.user,
        name,
        parentFolderId: parentFolderId || null,
        scope: scope || "independent",
      });
      res.status(201).json({ data: { folder } });
    },

    async renameFile(req, res) {
      const { fileId } = req.params;
      const { name } = req.body || {};
      const file = await fileService.renameFile({ user: req.user, fileId, name });
      res.json({ data: { file } });
    },

    async renameFolder(req, res) {
      const { folderId } = req.params;
      const { name } = req.body || {};
      const folder = await fileService.renameFolder({ user: req.user, folderId, name });
      res.json({ data: { folder } });
    },

    async move(req, res) {
      const { fileIds, folderIds, targetFolderId } = req.body || {};
      const result = await fileService.moveItems({
        user: req.user,
        fileIds: Array.isArray(fileIds) ? fileIds : [],
        folderIds: Array.isArray(folderIds) ? folderIds : [],
        targetFolderId: targetFolderId || null,
      });
      res.json({ data: result });
    },

    async remove(req, res) {
      const { fileIds, folderIds } = req.body || {};
      const result = await fileService.removeItems({
        user: req.user,
        fileIds: Array.isArray(fileIds) ? fileIds : [],
        folderIds: Array.isArray(folderIds) ? folderIds : [],
      });
      res.json({ data: result });
    },

    async uploadUrl(req, res) {
      const { name, size, contentType, folderId, scope } = req.body || {};
      const result = await fileService.requestUploadUrl({
        user: req.user,
        name,
        size,
        contentType,
        folderId: folderId || null,
        scope: scope || "independent",
      });
      res.json({ data: result });
    },

    async confirmUpload(req, res) {
      const { uploadId } = req.body || {};
      const result = await fileService.confirmUpload({ user: req.user, uploadId });
      res.json({ data: result });
    },

    async downloadUrl(req, res) {
      const { fileId } = req.params;
      const result = await fileService.getDownloadUrl({ user: req.user, fileId });
      res.json({ data: result });
    },

    async previewUrl(req, res) {
      const { fileId } = req.params;
      const result = await fileService.getPreviewUrl({ user: req.user, fileId });
      res.json({ data: result });
    },
  };
}
