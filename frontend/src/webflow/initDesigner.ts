/**
 * Runs when the UI is hosted inside the Webflow Designer extension iframe.
 * Outside Designer, `webflow` is absent — this is a no-op.
 */
export async function initWebflowDesigner(): Promise<void> {
  const api = (globalThis as { webflow?: { ready: () => Promise<void> } }).webflow;
  if (!api) return;
  await api.ready();
}
