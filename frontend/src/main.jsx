// main.jsx
// WHAT THIS FILE IS: the starting point of the website.
// WHAT IT DOES: loads the fonts and global styles, then draws the whole app inside the
// <div id="root"> from index.html. The "providers" wrapped around <App /> share things
// every page needs: the router (page navigation), toast messages and the signed-in user.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Fonts are bundled with the site, so nothing is loaded from the internet at runtime.
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
