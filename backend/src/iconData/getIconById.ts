import type { IconDataset } from "./types.js";
import { readSvgFile } from "./loader.js";

export type IconByIdWithoutSvg = {
  id: string;
  name: string;
  library: IconDataset["icons"][number]["library"];
  style: string;
  styles: string[];
  tags: string[];
};

export type IconByIdWithSvg = IconByIdWithoutSvg & {
  svg: string;
};

export async function getIconById(args: {
  dataset: IconDataset;
  id: string;
  includeSvg?: boolean;
}): Promise<null | (IconByIdWithoutSvg | IconByIdWithSvg)> {
  const record = args.dataset.iconById.get(args.id);
  if (!record) return null;

  if (!args.includeSvg) {
    const out: IconByIdWithoutSvg = {
      id: record.id,
      name: record.name,
      library: record.library,
      style: record.style,
      styles: record.styles,
      tags: record.tags
    };
    return out;
  }

  const svg = await readSvgFile(record.svgPath);
  const out: IconByIdWithSvg = {
    id: record.id,
    name: record.name,
    library: record.library,
    style: record.style,
    styles: record.styles,
    tags: record.tags,
    svg
  };
  return out;
}

