/// <reference types="@webflow/designer-extension-typings" />

const SKIP_METHOD = /^(get|has|remove|append|prepend|before|after|subscribe|constructor)$/i;

function collectFunctionKeys(obj: object): string[] {
  const keys = new Set<string>();
  let cur: object | null = obj;
  let depth = 0;
  while (cur && depth < 6) {
    for (const k of Reflect.ownKeys(cur)) {
      if (typeof k === "string") keys.add(k);
    }
    cur = Object.getPrototypeOf(cur);
    depth += 1;
  }
  return [...keys];
}

function nameLooksLikeEmbedSetter(name: string): boolean {
  if (SKIP_METHOD.test(name)) return false;
  if (!/^set[A-Z]/.test(name)) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("embed") ||
    lower.includes("html") ||
    lower.includes("markup") ||
    lower.includes("whtml") ||
    lower.includes("snippet") ||
    lower.includes("inner") ||
    lower.includes("fragment") ||
    (lower.includes("code") && !lower.includes("decode"))
  );
}

/**
 * Sets the custom HTML inside a native **Code Embed** (`type === "HtmlEmbed"`).
 * The public typings omit this API; runtime method names vary by Designer build.
 */
export async function setHtmlEmbedMarkup(embed: AnyElement, html: string): Promise<boolean> {
  if (embed.type !== "HtmlEmbed") {
    throw new Error("Expected a Code Embed (HtmlEmbed) element.");
  }

  const self = embed as unknown as Record<string, unknown>;

  async function tryCallMethod(
    thisArg: unknown,
    fn: (...args: unknown[]) => unknown,
    args: unknown[]
  ): Promise<void> {
    await Promise.resolve(fn.apply(thisArg, args));
  }

  async function tryCall(name: string): Promise<boolean> {
    const fn = self[name];
    if (typeof fn !== "function") return false;
    try {
      await tryCallMethod(embed, fn as (...a: unknown[]) => unknown, [html]);
      return true;
    } catch {
      try {
        await tryCallMethod(embed, fn as (...a: unknown[]) => unknown, [html, {}]);
        return true;
      } catch {
        return false;
      }
    }
  }

  const priorityNames = [
    "setInnerHTML",
    "setMarkup",
    "setHtml",
    "setEmbedHtml",
    "setEmbedCode",
    "setCustomCode",
    "setSnippet",
    "setInnerMarkup",
    "setCodeEmbed",
    "setEmbedContent",
    "setEmbedMarkup",
    "setHtmlEmbed",
    "setHtmlString",
    "setWhtml",
    "setEmbedWhtml",
    "setString",
    "setText",
    "setValue",
    "setData",
    "setEmbedData",
    "setPluginData",
    "setRawHtml"
  ];

  for (const name of priorityNames) {
    if (await tryCall(name)) return true;
  }

  for (const key of Object.keys(self)) {
    const sub = self[key];
    if (sub !== null && typeof sub === "object") {
      const subRec = sub as Record<string, unknown>;
      for (const name of priorityNames) {
        const fn = subRec[name];
        if (typeof fn === "function") {
          await tryCallMethod(sub, fn as (...a: unknown[]) => unknown, [html]);
          return true;
        }
      }
    }
  }

  const dynamicKeys = collectFunctionKeys(embed).filter((k) => nameLooksLikeEmbedSetter(k));
  dynamicKeys.sort();
  for (const name of dynamicKeys) {
    if (priorityNames.includes(name)) continue;
    if (await tryCall(name)) return true;
  }

  // Rare runtime hooks (non-string keys).
  for (const key of Reflect.ownKeys(self)) {
    if (typeof key !== "symbol") continue;
    const fn = (self as Record<symbol, unknown>)[key];
    if (typeof fn !== "function") continue;
    try {
      await tryCallMethod(embed, fn as (...a: unknown[]) => unknown, [html]);
      return true;
    } catch {
      try {
        await tryCallMethod(embed, fn as (...a: unknown[]) => unknown, [html, {}]);
        return true;
      } catch {
        // continue
      }
    }
  }

  return false;
}
