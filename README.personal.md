# IconDock — personal start guide

Quick notes for starting this project on your machine, including mistakes to avoid.

## Use this project path (not the other one)

This repo lives here:

`/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow`

There is a similar-looking path **without** `Coding Projects`:

`/Users/brysonmundia/Documents/Cursor AI Projects/Icon Library Webflow`

If you `cd` into the wrong tree, the `backend` folder may be empty or missing `package.json`, and npm will fail.

## Error you hit: `ENOENT` / missing `package.json`

Example:

```text
Could not read package.json: Error: ENOENT: no such file or directory, open '.../backend/package.json'
```

**Cause:** You were in a `backend` directory that is not the one inside **Coding Projects / Cursor AI Projects / Icon Library Webflow**, or the folder was not the full checkout.

**Fix:** Always `cd` to the path above (with **Coding Projects** in it), then into `backend` or `frontend`.

## Error: `503` — “Icon dataset not built…”

Example in the browser:

```text
Request failed: 503 {"error":"Icon dataset not built. Run `npm run build:dataset` in the backend folder."}
```

**Cause:** There is no `backend/data/manifest.json` yet (first run, or `backend/data` was deleted). The API cannot search icons without that file.

**Fix:** From the `backend` folder run:

```sh
npm run build:dataset
```

Then restart the backend (`npm run dev`). Refresh the IconDock page.

**Note:** The line “Skip `npm run build:dataset`” below only applies **after** `backend/data/manifest.json` already exists.

## Paths with spaces (zsh)

If you paste a path with spaces unquoted, the shell splits it and commands break.

**Wrong:**

```sh
cd Documents/Coding Projects/Icon Library Webflow/backend
# → "too many arguments" or wrong directory
```

**Right:**

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/backend"
```

Or step by step with quotes around each segment that has spaces.

## How to start IconDock

**Terminal 1 — backend (API on http://localhost:8787)**

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/backend"
npm install
npm run build:dataset
npm run dev
```

Skip `npm run build:dataset` if you already have a built dataset under `backend/data/` and do not need to rebuild.

**Terminal 2 — frontend (Vite; usually http://localhost:5173)**

```sh
cd "/Users/brysonmundia/Documents/Coding Projects/Cursor AI Projects/Icon Library Webflow/frontend"
npm install
npm run dev
```

## `dev` vs `build`

- **`npm run dev`** — run the app locally (what you want day to day).
- **`npm run build`** — compile TypeScript / production build; not the same as “starting” the servers.

For the full API reference and library list, see the main `README.md`.
