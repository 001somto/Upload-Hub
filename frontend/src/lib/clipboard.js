// lib/clipboard.js
// WHAT THIS FILE IS: a helper for the "Copy link" buttons.
// WHAT IT DOES: copies text to the clipboard. Returns true if it worked. Older browsers
// and some phones block the modern way, so a fallback method is tried second.

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(box);
      return ok;
    } catch {
      return false;
    }
  }
}
