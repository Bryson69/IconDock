# IconDock — personal resume guide

Use this doc when you pick the project back up: correct paths, **all servers**, commands to run, Webflow Designer steps, and what to paste where. For API details and library lists, see the main [`README.md`](./README.md).

---

## Project path (use this tree)

This repo lives here (note **Coding Projects** and **Cursor AI Projects**):

```text
/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow
```

A similar path **without** `Coding Projects` can look the same but be wrong — if `backend/package.json` is missing, you’re in the wrong folder.

**Always quote paths that contain spaces** in the terminal:

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow"
```

---

## Tomorrow: resume checklist (order matters)

1. **Terminal A — backend API** (must be running before the app can search icons or load SVGs).
2. **Backend env** — `backend/.env` exists and matches `backend/.env.example` (OAuth optional for basic icon search).
3. **Dataset** — if you see **503** “Icon dataset not built…”, run `npm run build:dataset` in `backend` once.
4. **Terminal B — Webflow extension static server** — after a **fresh build** of the frontend, run `npm run webflow:serve` from `frontend` so the Designer can load the extension bundle (default **http://localhost:1337**).
5. **Webflow Designer** — open your site → **Apps** → launch **IconDock** (or your app name) so the panel loads on the canvas side.

Optional: run **`npm run dev`** in `frontend` only if you want the standalone Vite UI in the browser (**http://localhost:5173**); the Designer extension still uses the **built** `frontend/dist` via `webflow:serve`, not the Vite dev server.

---

## Ports you need “live”

| What | Port | Command / notes |
|------|------|------------------|
| IconDock **API** (Express) | **8787** | `cd backend && npm run dev` (`PORT` in `.env`, default 8787) |
| **Webflow CLI** extension host | **1337** (default) | `cd frontend && npm run webflow:serve` — serves `frontend/dist` |
| Vite **dev** UI (optional, not the Designer iframe) | **5173** (typical) | `cd frontend && npm run dev` |

The extension UI in the Designer loads from **localhost:1337** (or whatever the CLI prints). API calls from the built app default to **http://localhost:8787** when the page is opened on **localhost:1337** (see `frontend/src/lib/api.ts`).

---

## 1) Backend — install, env, dataset, run

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/backend"
npm install
```

**Environment file** — copy the example and edit (do **not** commit real secrets):

```sh
cp .env.example .env
```

Fill at minimum (see comments in `.env.example`):

- `PORT=8787` (default)
- For Webflow OAuth (optional): `WEBFLOW_CLIENT_ID`, `WEBFLOW_CLIENT_SECRET`, `WEBFLOW_REDIRECT_URI`, `WEBFLOW_OAUTH_SCOPES`

**Build icon dataset** (required once, or after deleting `backend/data`):

```sh
npm run build:dataset
```

**Start the API:**

```sh
npm run dev
```

Leave this terminal open. You should see the server listening on **8787**.

---

## 2) Frontend — build for Webflow, then serve to Designer

From a **second** terminal:

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/frontend"
npm install
npm run build
npm run webflow:serve
```

- **`npm run build`** — compiles TypeScript and writes the Designer bundle to **`frontend/dist`** (see `frontend/webflow.json` → `publicDir: "dist"`).
- **`npm run webflow:serve`** — Webflow CLI serves that folder (default **http://localhost:1337**). Follow any CLI prompts to log in / link the app.

Then in **Webflow Designer**: open your site, use **Apps** to open **IconDock** (or the name you registered). The panel should talk to **http://localhost:8787** for `/api/*` while you’re on `localhost:1337`.

**If the API runs somewhere else** (e.g. production URL), set the base URL **before** `npm run build`:

```sh
# example — only if you need a non-default API origin
export VITE_API_BASE_URL="https://your-api.example.com"
npm run build
```

Or use a `frontend/.env` / `.env.local` with `VITE_API_BASE_URL=...` and rebuild.

---

## 3) Webflow app registration (one-time / when things change)

Summarized; full notes are in [`README.md`](./README.md) → **Webflow Designer Extension**.

1. Webflow: **Workspace** → **Settings** → **Apps & integrations** → **App Development** → create app.
2. Enable **Designer Extension**.
3. (Optional) **Data Client** + redirect URI matching the backend, e.g.  
   `http://localhost:8787/api/oauth/webflow/callback`
4. Copy **Client ID** and **Client Secret** into **`backend/.env`** (never commit).

---

## 4) “Paste” / type this — quick reference

**Redirect URI** (must match Webflow app settings and `backend/.env` exactly):

```text
http://localhost:8787/api/oauth/webflow/callback
```

**Shell — backend folder:**

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/backend"
```

**Shell — frontend folder:**

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/frontend"
```

**After code changes to the extension UI**, rebuild and keep `webflow:serve` running:

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/frontend"
npm run build
# restart npm run webflow:serve if needed
```

**Production bundle for upload** (when you’re not using local serve):

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/frontend"
npm run webflow:bundle
```

---

## Errors you already hit (quick fixes)

### `ENOENT` / missing `package.json`

You’re not in the **Coding Projects / Cursor AI Projects / Icon Library Webflow** repo. `cd` to the path at the top of this file.

### `503` — “Icon dataset not built…”

From `backend`:

```sh
npm run build:dataset
```

Restart `npm run dev`, refresh.

### Paths with spaces

Use quotes around the full path when you `cd`, e.g.:

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/backend"
```

---

## `dev` vs `build`

- **`npm run dev`** (backend or frontend) — local development servers.
- **`npm run build`** (frontend) — required to refresh **`dist/`** for **`webflow:serve`** and the Designer.

---

## Open issue — resume later (embed + Webflow clipboard)

**Insert embed on canvas** and **paste-as-embed** flows still hit Webflow’s **“The clipboard is empty”** in some cases. Likely causes: Designer **iframe** + clipboard permissions, and Webflow’s paste expecting certain **clipboard MIME types** (`text/html` vs `text/plain`). The UI now includes a manual embed HTML box and a **`copy`** handler that sets both `text/html` and `text/plain`; if it still fails, next steps are to verify in **Chrome DevTools** (Application → Clipboard / paste in parent vs iframe) and Webflow’s current Designer Extension docs.

Track this when you resume; it does **not** block running the API + extension search/insert-SVG flows.

---

## Optional: standalone browser UI (not the Designer)

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/frontend"
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**). The Vite config **proxies `/api`** to **8787**, so keep the backend running.
