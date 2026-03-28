/**
 * Runs when the UI is hosted inside the Webflow Designer extension iframe.
 * Outside Designer, `webflow` is absent — this is a no-op.
 *
 * Matches Webflow’s app tutorial: call `ready()`, then optional UI APIs (e.g. panel size).
 * @see https://www.youtube.com/watch?v=rfEkIB0_ZDA
 */
export async function initWebflowDesigner(): Promise<void> {
  const api = (
    globalThis as {
      webflow?: {
        ready: () => Promise<void>;
        setExtensionSize?: (
          size: "default" | "compact" | "comfortable" | "large"
        ) => Promise<null>;
      };
    }
  ).webflow;
  if (!api) return;
  await api.ready();
  // webflow.json also sets size; calling here keeps runtime behavior aligned with the official hybrid/extension examples.
  try {
    if (typeof api.setExtensionSize === "function") {
      await api.setExtensionSize("large");
    }
  } catch {
    // Non-fatal if the Designer disallows resize in context
  }
}
