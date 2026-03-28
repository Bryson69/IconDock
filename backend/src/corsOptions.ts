import type { CorsOptions } from "cors";

/** Hosted Designer Extensions use subdomains of webflow-ext.com (see your app’s Designer Extension URI in Workspace). */
const WEBFLOW_DESIGNER_EXT = /^https:\/\/[a-z0-9]+\.webflow-ext\.com$/;

function extraOrigins(): Set<string> {
  const raw = process.env.CORS_ORIGINS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function strictOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  const allowList = extraOrigins();
  if (allowList.has(origin)) {
    callback(null, true);
    return;
  }
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    callback(null, true);
    return;
  }
  if (process.env.CORS_ALLOW_WEBFLOW_EXT !== "false" && WEBFLOW_DESIGNER_EXT.test(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}

/**
 * CORS policy:
 * - **Default** (`CORS_MODE` unset or `open`): reflect any `Origin` — same behavior as `cors()` with no config, so standalone web + proxy setups keep working.
 * - **Strict** (`CORS_MODE=strict`): Webflow tutorial style — localhost, `*.webflow-ext.com` (unless disabled), and `CORS_ORIGINS` only.
 *
 * @see https://developers.webflow.com/data/docs/designer-extensions/getting-started
 * @see https://www.youtube.com/watch?v=rfEkIB0_ZDA
 */
export function createCorsOptions(): CorsOptions {
  const strict = process.env.CORS_MODE === "strict";

  if (!strict) {
    return { origin: true };
  }

  return {
    origin: strictOrigin,
    methods: ["GET", "HEAD", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };
}
