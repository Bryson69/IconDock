# IconDock

IconDock is a React web app that lets you search and use icons from multiple free icon libraries in one place.

## Requirements

- Node.js (for both `frontend` and `backend`)

## Setup

### 1) Backend (API + dataset build)

```sh
cd backend
npm install
npm run build:dataset
npm run dev
```

To build only specific libraries (faster for development / rebuilding):

```sh
ICONDOCK_LIBRARIES=material,fontawesome npm run build:dataset
# or:
npm run build:dataset:material-fa
```

Supported local libraries in dataset build:

- Material Design Icons
- Material Symbols
- Font Awesome Free
- Heroicons
- Lucide
- Phosphor Icons (multi-weight)
- Remix Icon
- Iconoir
- Bootstrap Icons

Remote search library (not part of local dataset build):

- SVG Repo (search only, paginated)

The API will be available at `http://localhost:8787`.

### 2) Frontend (UI)

```sh
cd frontend
npm install
npm run dev
```

The frontend dev server will proxy requests to the backend.

## API (high level)

- `GET /api/icons/libraries`
- `GET /api/icons/status` (dataset built + icon counts)
- `GET /api/icons/search?query=&library=&style=&limit=&offset=`
- `GET /api/icons/svg/:id` (returns `{ id, name, library, style, styles, tags, svg }`)
- `GET /api/icons/png/:id?size=512`

## Webflow Designer Extension

The `frontend` app is configured as a **Webflow App** Designer Extension: `frontend/webflow.json` (manifest: name, Designer API v2, panel size, build output folder `dist`).

### Register the app in Webflow

1. In Webflow: **Workspace** → **Settings** → **Apps & integrations** → **App Development** → **Create an App** (workspace admin required).
2. Enable **Designer Extension** so the UI opens in the Designer side panel.
3. (Optional) Enable **Data Client** if you want OAuth against the Webflow Data API. Add a **Redirect URI** that matches your backend, e.g. `http://localhost:8787/api/oauth/webflow/callback` for local dev, or your HTTPS callback in production.
4. Under Data Client, pick **scopes** that match what you need (must be a superset of `WEBFLOW_OAUTH_SCOPES` on the server). Icon search uses this repo’s API, not Webflow CMS; common starter scopes are `sites:read` and `authorized_user:read` if you later call Webflow APIs.

Copy **Client ID** and **Client Secret** into `backend/.env` (see `backend/.env.example`). Never commit secrets.

### OAuth routes (Data Client)

With the backend running and env vars set:

- `GET /api/oauth/webflow/authorize` — browser redirect to Webflow’s consent screen  
- `GET /api/oauth/webflow/authorize-url` — JSON `{ "url": "..." }` for opening auth in a new window from the extension  
- `GET /api/oauth/webflow/callback` — OAuth redirect handler; exchanges `code` for an access token (token is only returned in the JSON body when `NODE_ENV` is not `production`)

### Run the extension locally

1. Start the IconDock API: `cd backend && npm run dev`.
2. Point the extension build at the API (Designer iframe is not same-origin as your API):

   ```sh
   cd frontend
   cp .env.example .env.local
   # Set VITE_API_BASE_URL=http://localhost:8787 in .env.local
   npm run build
   ```

3. From `frontend`, run:

   ```sh
   npm run webflow:serve
   ```

   Follow the Webflow CLI prompts to load the extension in the Designer. The published bundle is the Vite output in `frontend/dist` (`webflow.json` → `publicDir`).

4. To produce a bundle for upload to Webflow:

   ```sh
   npm run webflow:bundle
   ```

The UI calls `webflow.ready()` when the global `webflow` object exists (Designer only).

### CORS

The backend uses open CORS for API routes. For a public API, restrict origins in your reverse proxy or `cors` configuration to Webflow and your app domains.

## Extension-ready structure (bonus)

The frontend talks to a stable REST API (`/api/icons/*`). The same contract works for the Webflow Designer Extension via `VITE_API_BASE_URL` and for other hosts (e.g. browser extensions).

