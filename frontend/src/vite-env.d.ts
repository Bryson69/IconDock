/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin of the IconDock API when the UI runs outside same-origin (e.g. Webflow Designer iframe). No trailing slash. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

