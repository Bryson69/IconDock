import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Prefer `backend/.env` next to `src/` or `dist/`, then CWD. */
const candidates = [
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env")
];

let loaded = false;
for (const envPath of candidates) {
  if (!fs.existsSync(envPath)) continue;
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    // eslint-disable-next-line no-console
    console.warn(`[IconDock] Could not parse .env at ${envPath}:`, result.error.message);
    continue;
  }
  const n = result.parsed ? Object.keys(result.parsed).length : 0;
  if (n > 0) {
    loaded = true;
    // eslint-disable-next-line no-console
    console.log(`[IconDock] Loaded ${n} variable(s) from ${envPath}`);
    break;
  }
}

if (!loaded) {
  // eslint-disable-next-line no-console
  console.warn(
    "[IconDock] No usable .env found. Copy backend/.env.example to backend/.env, add WEBFLOW_* values, and save the file."
  );
}
