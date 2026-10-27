import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Plugin } from "vite";
import { MARKETING_PAGES } from "../src/lib/constants/marketing-pages";
import { SITE_URL } from "../src/lib/constants/seo";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceOnce(html: string, pattern: RegExp, value: string): string {
  if (!pattern.test(html)) {
    throw new Error(`marketing-page-html: index.html has no match for ${pattern}`);
  }
  return html.replace(pattern, (_match, before: string, after: string) =>
    `${before}${value}${after}`,
  );
}

function withMetaContent(
  html: string,
  attribute: "name" | "property",
  key: string,
  value: string,
): string {
  return replaceOnce(
    html,
    new RegExp(`(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*(")`),
    value,
  );
}

function readPageMeta(
  root: string,
  namespace: string,
  metaPath: readonly string[],
): { title: string; description: string } {
  let meta: unknown = JSON.parse(
    readFileSync(path.join(root, "src/locales/en", `${namespace}.json`), "utf-8"),
  );
  for (const key of metaPath) meta = (meta as Record<string, unknown>)?.[key];
  const { title, description } = (meta ?? {}) as Record<string, unknown>;
  if (typeof title !== "string" || typeof description !== "string") {
    throw new Error(
      `marketing-page-html: ${namespace}.${metaPath.join(".")} needs a title and description`,
    );
  }
  return { title, description };
}

export function marketingPageHtml(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "marketing-page-html",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = readFileSync(path.join(outDir, "index.html"), "utf-8");
      for (const page of MARKETING_PAGES) {
        const meta = readPageMeta(root, page.namespace, page.metaPath);
        const title = escapeHtml(meta.title);
        const description = escapeHtml(meta.description);
        const url = escapeHtml(`${SITE_URL}${page.path}`);
        let html = replaceOnce(template, /(<title>)[^<]*(<\/title>)/, title);
        html = replaceOnce(
          html,
          /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
          url,
        );
        html = withMetaContent(html, "name", "description", description);
        html = withMetaContent(html, "property", "og:url", url);
        html = withMetaContent(html, "property", "og:title", title);
        html = withMetaContent(html, "property", "og:description", description);
        html = withMetaContent(html, "name", "twitter:title", title);
        html = withMetaContent(html, "name", "twitter:description", description);
        const file =
          page.path === "/" ? "index.html" : `${page.path.slice(1)}.html`;
        writeFileSync(path.join(outDir, file), html);
      }
    },
  };
}
