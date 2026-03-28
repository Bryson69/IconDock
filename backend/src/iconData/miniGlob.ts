import fs from "node:fs";
import path from "node:path";

// Minimal glob helper for patterns like `${dir}/**/*.svg`.
export function globSync(pattern: string): string[] {
  const svgIndex = pattern.indexOf("/**/");
  if (svgIndex === -1) {
    // Not supported; return empty rather than silently doing something wrong.
    return [];
  }

  const baseDir = pattern.slice(0, svgIndex);
  if (!pattern.endsWith("*.svg")) return [];

  const out: string[] = [];
  const stack: string[] = [baseDir];

  while (stack.length) {
    const current = stack.pop()!;
    if (!fs.existsSync(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile() && e.name.endsWith(".svg")) {
        out.push(full);
      }
    }
  }

  return out;
}

