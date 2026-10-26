// utils/fileHelpers.js
// Helpers for file categories, unique naming, and size validations.

import path from "path";

const EXTENSION_CATEGORIES = {
  pdf: "Documents",
  doc: "Documents",
  docx: "Documents",
  txt: "Documents",
  rtf: "Documents",
  odt: "Documents",
  xls: "Documents",
  xlsx: "Documents",
  csv: "Documents",
  ppt: "Documents",
  pptx: "Documents",

  png: "Images",
  jpg: "Images",
  jpeg: "Images",
  webp: "Images",
  gif: "Images",
  svg: "Images",
  bmp: "Images",

  mp4: "Videos",
  webm: "Videos",
  mov: "Videos",
  avi: "Videos",
  mkv: "Videos",

  mp3: "Audio",
  wav: "Audio",
  ogg: "Audio",
  flac: "Audio",
  aac: "Audio",

  zip: "Archives",
  rar: "Archives",
  "7z": "Archives",
  tar: "Archives",
  gz: "Archives",
};

export function categorizeFile(filename, contentType = "") {
  const ext = (path.extname(filename || "").replace(/^\./, "")).toLowerCase();
  if (EXTENSION_CATEGORIES[ext]) return EXTENSION_CATEGORIES[ext];

  if (contentType.startsWith("image/")) return "Images";
  if (contentType.startsWith("video/")) return "Videos";
  if (contentType.startsWith("audio/")) return "Audio";
  if (contentType.includes("pdf") || contentType.includes("word") || contentType.includes("sheet") || contentType.includes("text")) {
    return "Documents";
  }
  if (contentType.includes("zip") || contentType.includes("tar") || contentType.includes("compressed")) {
    return "Archives";
  }
  return "Others";
}

export function deduplicateFileName(existingNames, originalName) {
  const lowerNames = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!lowerNames.has(originalName.toLowerCase())) return originalName;

  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  let counter = 1;
  while (true) {
    const candidate = `${base} (${counter})${ext}`;
    if (!lowerNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }
}
