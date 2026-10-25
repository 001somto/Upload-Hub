// hooks/useDocumentTitle.js
// WHAT THIS FILE IS: a tiny helper that sets the browser tab title.
// WHAT IT DOES: `useDocumentTitle("My files")` changes the tab to "My files | UploadHub".

import { useEffect } from "react";
import { settings } from "../config/settings";

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${settings.appName}` : settings.appName;
  }, [title]);
}
