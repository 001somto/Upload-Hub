// components/files/FileIcon.jsx
// WHAT THIS FILE IS: the little icon shown beside a file or folder name.
// WHAT IT DOES: picks a folder, image, PDF or generic document icon from the file's type.

import { File, FileText, Folder, ImageIcon } from "../../lib/icons";

export default function FileIcon({ contentType = "", folder = false, className = "h-5 w-5" }) {
  if (folder) return <Folder className={`${className} text-leaf-700`} aria-hidden="true" />;
  if (contentType.startsWith("image/")) return <ImageIcon className={`${className} text-sky-500`} aria-hidden="true" />;
  if (contentType === "application/pdf") return <FileText className={`${className} text-red-500`} aria-hidden="true" />;
  return <File className={`${className} text-leaf-600`} aria-hidden="true" />;
}
