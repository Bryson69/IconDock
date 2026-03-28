import { Router } from "express";
import type { OauthScope } from "webflow-api/api/types/OAuthScope";
import { WebflowClient } from "webflow-api";

function oauthScopesFromEnv(): OauthScope[] {
  const raw = process.env.WEBFLOW_OAUTH_SCOPES ?? "sites:read authorized_user:read";
  return raw.split(/\s+/).filter(Boolean) as OauthScope[];
}

/**
 * OAuth 2.0 (authorization code) for Webflow Data API apps.
 * Register redirect URI in Workspace → Apps & Integrations → your app → Data Client:
 * e.g. http://localhost:8787/api/oauth/webflow/callback
 */
export const webflowOAuthRouter = Router();

webflowOAuthRouter.get("/authorize", (_req, res) => {
  const clientId = process.env.WEBFLOW_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID is not set" });
    return;
  }
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI;
  const url = WebflowClient.authorizeURL({
    clientId,
    redirectUri,
    scope: oauthScopesFromEnv()
  });
  res.redirect(302, url);
});

/** Same as GET /authorize but returns JSON so a Designer Extension can `window.open(url)`. */
webflowOAuthRouter.get("/authorize-url", (_req, res) => {
  const clientId = process.env.WEBFLOW_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID is not set" });
    return;
  }
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI;
  const url = WebflowClient.authorizeURL({
    clientId,
    redirectUri,
    scope: oauthScopesFromEnv()
  });
  res.json({ url });
});

webflowOAuthRouter.get("/callback", async (req, res) => {
  const code = req.query.code;
  const oauthError = req.query.error;
  if (typeof oauthError === "string") {
    res.status(400).json({ error: oauthError });
    return;
  }
  if (typeof code !== "string" || !code) {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  const clientId = process.env.WEBFLOW_CLIENT_ID;
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, and WEBFLOW_REDIRECT_URI must be set" });
    return;
  }

  try {
    const accessToken = await WebflowClient.getAccessToken({
      clientId,
      clientSecret,
      code,
      redirectUri
    });
    const dev = process.env.NODE_ENV !== "production";
    if (dev) {
      res.json({ ok: true, access_token: accessToken });
    } else {
      res.json({ ok: true });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Token exchange failed";
    res.status(500).json({ error: message });
  }
});
