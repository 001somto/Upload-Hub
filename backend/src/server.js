// server.js
// WHAT THIS FILE IS: the file you run to start the backend ("npm start" or "npm run dev").
// WHAT IT DOES: reads the settings, builds the app and starts listening for requests.

import { createApp, buildDependencies } from "./app.js";
import { loadConfig } from "./config/env.js";

const config = loadConfig();
const app = createApp(buildDependencies(config));

app.listen(config.port, () => {
  console.log(`UploadHub backend running on http://localhost:${config.port} (${config.nodeEnv}, storage: ${config.storageMode})`);
  if (config.storageMode === "memory") console.log("WARNING: memory mode - accounts disappear when the server stops.");
});
