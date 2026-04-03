import { Router } from "express";
import type { OauthScope } from "webflow-api/api/types/OAuthScope";
import { WebflowClient } from "webflow-api";

function oauthScopesFromEnv(): OauthScope[] {
  const raw = process.env.WEBFLOW_OAUTH_SCOPES ?? "sites:read authorized_user:read";
  return raw.split(/\s+/).filter(Boolean) as OauthScope[];
}

function normalizeRedirectUri(u: string): string {
  return u.trim().replace(/\u200B/g, "");
}

async function exchangeTokenForm(args: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  includeRedirectUri: boolean;
}): Promise<string> {
  const params = new URLSearchParams();
  params.set("client_id", args.clientId);
  params.set("client_secret", args.clientSecret);
  params.set("code", args.code);
  params.set("grant_type", "authorization_code");
  if (args.includeRedirectUri) {
    params.set("redirect_uri", args.redirectUri);
  }

  const tokenRes = await fetch("https://api.webflow.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const text = await tokenRes.text();
  let json: { access_token?: string; error?: string; error_description?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`Token endpoint ${tokenRes.status}: ${text.slice(0, 500)}`);
  }

  if (!tokenRes.ok || json.error) {
    throw new Error(`Status code: ${tokenRes.status}\nBody: ${JSON.stringify(json)}`);
  }
  if (!json.access_token) {
    throw new Error("Missing access_token in token response");
  }
  return json.access_token;
}

/**
 * Tries several token requests. Webflow’s install flow may omit `redirect_uri` on the
 * authorize step (using the single registered URI); RFC 6749 then requires omitting it on
 * the token step too—sending `redirect_uri` here can yield `invalid_redirect_uri`.
 */
async function exchangeAuthorizationCode(args: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<string> {
  const redirectUri = normalizeRedirectUri(args.redirectUri);
  const attempts: Array<{ label: string; run: () => Promise<string> }> = [
    {
      label: "form-urlencoded with redirect_uri",
      run: () =>
        exchangeTokenForm({
          ...args,
          redirectUri,
          includeRedirectUri: true
        })
    },
    {
      label: "form-urlencoded without redirect_uri (install flows that omit it on authorize)",
      run: () =>
        exchangeTokenForm({
          ...args,
          redirectUri,
          includeRedirectUri: false
        })
    },
    {
      label: "JSON body (webflow-api SDK)",
      run: () =>
        WebflowClient.getAccessToken({
          clientId: args.clientId,
          clientSecret: args.clientSecret,
          code: args.code,
          redirectUri
        })
    }
  ];

  const failures: string[] = [];
  for (const { label, run } of attempts) {
    try {
      return await run();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`${label}: ${msg}`);
    }
  }

  throw new Error(failures.join("\n\n---\n\n"));
}

/**
 * OAuth 2.0 (authorization code) for Webflow Data API apps.
 * Register redirect URI in Workspace → Apps & Integrations → your app → Data Client:
 * e.g. http://localhost:8787/api/oauth/webflow/callback
 */
export const webflowOAuthRouter = Router();

webflowOAuthRouter.get("/status", (_req, res) => {
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI?.trim() ?? "";
  res.json({
    clientIdSet: Boolean(process.env.WEBFLOW_CLIENT_ID?.trim()),
    clientSecretSet: Boolean(process.env.WEBFLOW_CLIENT_SECRET?.trim()),
    redirectUri,
    hint:
      "Use this exact redirect URI in Webflow → Workspace → Apps → your app → Data Client → Redirect URI (including http/https and path)."
  });
});

/** JSON only: same authorize URL as GET /authorize, for debugging redirect_uri without redirecting. */
webflowOAuthRouter.get("/authorize-debug", (_req, res) => {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  if (!clientId) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID is not set" });
    return;
  }
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (!redirectUri) {
    res.status(500).json({ error: "WEBFLOW_REDIRECT_URI is not set" });
    return;
  }
  const authorizeUrl = WebflowClient.authorizeURL({
    clientId,
    redirectUri,
    scope: oauthScopesFromEnv()
  });
  let redirectUriInAuthorizeUrl: string | null = null;
  try {
    redirectUriInAuthorizeUrl = new URL(authorizeUrl).searchParams.get("redirect_uri");
  } catch {
    // ignore
  }
  const redirectUriDecoded =
    redirectUriInAuthorizeUrl != null
      ? (() => {
          try {
            return decodeURIComponent(redirectUriInAuthorizeUrl);
          } catch {
            return redirectUriInAuthorizeUrl;
          }
        })()
      : null;
  res.json({
    redirectUriFromEnv: redirectUri,
    redirectUriInAuthorizeQuery: redirectUriInAuthorizeUrl,
    redirectUriDecoded,
    authorizeUrl,
    hint:
      "redirectUriDecoded must match Webflow’s Redirect URI field. If install still fails, Webflow’s install screen may use a different OAuth client than this server — ensure WEBFLOW_CLIENT_ID matches that app."
  });
});

webflowOAuthRouter.get("/authorize", (_req, res) => {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  if (!clientId) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID is not set" });
    return;
  }
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (!redirectUri) {
    res.status(500).json({
      error: "WEBFLOW_REDIRECT_URI is not set",
      hint: "Set WEBFLOW_REDIRECT_URI in backend/.env to e.g. http://localhost:8787/api/oauth/webflow/callback and add the same URL in your Webflow app’s Data Client settings."
    });
    return;
  }
  const url = WebflowClient.authorizeURL({
    clientId,
    redirectUri,
    scope: oauthScopesFromEnv()
  });
  res.redirect(302, url);
});

/** Same as GET /authorize but returns JSON so a Designer Extension can `window.open(url)`. */
webflowOAuthRouter.get("/authorize-url", (_req, res) => {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  if (!clientId) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID is not set" });
    return;
  }
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (!redirectUri) {
    res.status(500).json({ error: "WEBFLOW_REDIRECT_URI is not set" });
    return;
  }
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

  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET?.trim();
  const redirectUriRaw = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUriRaw) {
    res.status(500).json({ error: "WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, and WEBFLOW_REDIRECT_URI must be set" });
    return;
  }
  const redirectUri = normalizeRedirectUri(redirectUriRaw);

  try {
    const accessToken = await exchangeAuthorizationCode({
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
    const hint =
      message.includes("invalid_grant") || message.includes("invalid_redirect_uri")
        ? "Codes are single-use—start from /api/oauth/webflow/authorize and finish without refreshing. If all retries failed, confirm the Redirect URI in Webflow matches WEBFLOW_REDIRECT_URI and contact Webflow support with this error."
        : undefined;
    res.status(500).json(hint ? { error: message, hint } : { error: message });
  }
});
