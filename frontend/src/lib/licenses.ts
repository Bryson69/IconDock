import type { IconLibraryId } from "./types";

/**
 * Central license metadata for bundled icon sources. Update here when adding libraries or terms change.
 */
export type IconLibraryLicense = {
  /** Short name shown in tooltips (e.g. "MIT") */
  license: string;
  licenseUrl: string;
  attributionRequired: boolean;
  attributionText?: string;
  website: string;
  /** One-line summary for the Licenses screen */
  shortDescription: string;
};

export type LibraryLicenseEntry = IconLibraryLicense & {
  /** Display name (matches library picker where applicable) */
  name: string;
};

/** Shown in footer and Licenses screen — IconDock does not own third-party icons. */
export const OWNERSHIP_DISCLAIMER =
  "Icons are provided by their respective open-source projects and terms. IconDock does not own, represent, or warrant these assets.";

export const LIBRARY_LICENSES: Record<IconLibraryId, LibraryLicenseEntry> = {
  lucide: {
    name: "Lucide",
    license: "ISC",
    licenseUrl: "https://lucide.dev/license",
    attributionRequired: false,
    website: "https://lucide.dev",
    shortDescription:
      "Community-maintained fork of Feather-style icons; ISC license allows broad use with minimal conditions."
  },
  phosphor: {
    name: "Phosphor Icons",
    license: "MIT",
    licenseUrl: "https://github.com/phosphor-icons/core/blob/main/LICENSE",
    attributionRequired: false,
    website: "https://phosphoricons.com",
    shortDescription: "Flexible icon family for interfaces, fonts, and assets; MIT licensed."
  },
  "material-symbols": {
    name: "Material Symbols",
    license: "Apache-2.0",
    licenseUrl: "https://github.com/google/material-design-icons/blob/master/LICENSE",
    attributionRequired: false,
    website: "https://fonts.google.com/icons",
    shortDescription:
      "Google’s variable font icon set; use follows Apache 2.0 and Google’s trademark guidelines for the Material design system."
  },
  remix: {
    name: "Remix Icon",
    license: "Apache-2.0",
    licenseUrl: "https://github.com/Remix-Design/RemixIcon/blob/master/License",
    attributionRequired: false,
    website: "https://remixicon.com",
    shortDescription: "Neutral-style system icons for web and apps; Apache 2.0."
  },
  heroicons: {
    name: "Heroicons",
    license: "MIT",
    licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
    attributionRequired: false,
    website: "https://heroicons.com",
    shortDescription: "Hand-crafted SVG icons by Tailwind Labs; MIT licensed."
  },
  iconoir: {
    name: "Iconoir",
    license: "MIT",
    licenseUrl: "https://github.com/iconoir-icons/iconoir/blob/main/LICENSE",
    attributionRequired: false,
    website: "https://iconoir.com",
    shortDescription: "High-quality open-source icons with a consistent stroke; MIT."
  },
  bootstrap: {
    name: "Bootstrap Icons",
    license: "MIT",
    licenseUrl: "https://github.com/twbs/icons/blob/main/LICENSE.md",
    attributionRequired: false,
    website: "https://icons.getbootstrap.com",
    shortDescription: "Official icon library for Bootstrap; MIT licensed."
  },
  fontawesome: {
    name: "Font Awesome Free",
    license: "CC BY 4.0 (icons) / SIL OFL 1.1 (fonts) / MIT (code)",
    licenseUrl: "https://fontawesome.com/license/free",
    attributionRequired: true,
    attributionText:
      "Font Awesome Free icons are licensed under CC BY 4.0; fonts under SIL OFL 1.1; code under MIT. See Font Awesome’s Free license page for attribution and branding requirements when using icons.",
    website: "https://fontawesome.com",
    shortDescription:
      "Only Font Awesome Free assets from the official free package are indexed. Pro-only icons are not included."
  },
  material: {
    name: "Material Design Icons",
    license: "Apache-2.0",
    licenseUrl: "https://github.com/google/material-design-icons/blob/master/LICENSE",
    attributionRequired: false,
    website: "https://github.com/google/material-design-icons",
    shortDescription:
      "Classic Material Design icon SVGs; Apache 2.0. Distinct from Material Symbols (variable font set)."
  }
};

/**
 * SVG Repo is a directory of user-submitted SVGs — there is no single license for “all SVG Repo icons.”
 * When this app integrates SVG Repo results, each item must carry its own license/source and may be filtered if unknown.
 */
export const SVG_REPO_AGGREGATE: LibraryLicenseEntry = {
  name: "SVG Repo (directory)",
  license: "Varies by icon (see site terms)",
  licenseUrl: "https://www.svgrepo.com/page/terms/",
  attributionRequired: true,
  attributionText:
    "SVG Repo aggregates third-party SVGs. Each icon may have different license and attribution requirements. Always verify the license on the icon’s page before use. IconDock may hide or flag results without verifiable license/source metadata.",
  website: "https://www.svgrepo.com",
  shortDescription:
    "Not a single licensed set — treat each icon under its own terms. Prefer links to the original author page when shown in the app."
};

export function getLicenseForLibrary(id: IconLibraryId): LibraryLicenseEntry {
  return LIBRARY_LICENSES[id];
}

/** Stable order for the Licenses screen */
export const LICENSES_PAGE_ORDER: IconLibraryId[] = [
  "material",
  "material-symbols",
  "fontawesome",
  "heroicons",
  "lucide",
  "phosphor",
  "remix",
  "iconoir",
  "bootstrap"
];

