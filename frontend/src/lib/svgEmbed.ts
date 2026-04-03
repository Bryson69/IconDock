/**
 * Wraps prepared SVG markup as an HTML embed snippet (for clipboard or canvas insert).
 * Use after {@link prepareSvgForCanvas} so the inner `<svg>` matches Webflow paste behavior.
 */
export function buildSvgEmbedHtml(preparedSvgMarkup: string): string {
  return `<div class="icondock-embed" aria-hidden="true">\n${preparedSvgMarkup.trim()}\n</div>`;
}
