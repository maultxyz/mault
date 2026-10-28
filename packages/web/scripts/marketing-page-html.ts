import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";
import { build, type Plugin } from "vite";
import { MARKETING_PAGES } from "../src/lib/constants/marketing-pages";
import {
  PRERENDER_PATH_GUARD_SCRIPT,
  SITE_URL,
} from "../src/lib/constants/seo";

interface PrerenderedPages {
  envSignature: string;
  pages: Record<string, string>;
}

const RENDER_PAGES_SCRIPT = `
const [entryUrl, ...paths] = process.argv.slice(1);
const prerender = await import(entryUrl);
const pages = {};
for (const path of paths) pages[path] = await prerender.renderMarketingPage(path);
process.stdout.write(JSON.stringify({ envSignature: prerender.prerenderEnvSignature(), pages }));
`;

async function prerenderPages(
  root: string,
  configFile: string | false | undefined,
  outDir: string,
  paths: string[],
): Promise<PrerenderedPages> {
  await build({
    root,
    configFile,
    logLevel: "warn",
    ssr: { noExternal: true },
    build: {
      ssr: "src/prerender.tsx",
      outDir,
      emptyOutDir: true,
      rollupOptions: { output: { format: "esm", entryFileNames: "prerender.mjs" } },
    },
  });
  const entryUrl = pathToFileURL(path.join(outDir, "prerender.mjs")).href;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", RENDER_PAGES_SCRIPT, entryUrl, ...paths],
    {
      cwd: root,
      env: { ...process.env, NODE_ENV: "development" },
      maxBuffer: 64 * 1024 * 1024,
      encoding: "utf-8",
    },
  );
  return JSON.parse(output) as PrerenderedPages;
}

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

function withPageMeta(
  template: string,
  pagePath: string,
  meta: { title: string; description: string },
): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(`${SITE_URL}${pagePath}`);
  let html = replaceOnce(template, /(<title>)[^<]*(<\/title>)/, title);
  html = replaceOnce(html, /(<link\s+rel="canonical"\s+href=")[^"]*(")/, url);
  html = withMetaContent(html, "name", "description", description);
  html = withMetaContent(html, "property", "og:url", url);
  html = withMetaContent(html, "property", "og:title", title);
  html = withMetaContent(html, "property", "og:description", description);
  html = withMetaContent(html, "name", "twitter:title", title);
  return withMetaContent(html, "name", "twitter:description", description);
}

function withPrerenderedApp(
  html: string,
  pagePath: string,
  envSignature: string,
  appHtml: string,
): string {
  const rootPattern = /<div id="root"><\/div>/;
  if (!rootPattern.test(html)) {
    throw new Error("marketing-page-html: index.html has no empty #root");
  }
  return html.replace(
    rootPattern,
    () =>
      `<div id="root" data-prerendered-path="${escapeHtml(pagePath)}" data-prerendered-env="${escapeHtml(envSignature)}">${appHtml}</div>${PRERENDER_PATH_GUARD_SCRIPT}`,
  );
}

export function marketingPageHtml(): Plugin {
  let root = "";
  let outDir = "";
  let configFile: string | false | undefined;
  return {
    name: "marketing-page-html",
    apply: (_config, env) => env.command === "build" && !env.isSsrBuild,
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
      configFile = config.configFile;
    },
    async closeBundle() {
      const template = readFileSync(path.join(outDir, "index.html"), "utf-8");
      const ssrOutDir = mkdtempSync(path.join(tmpdir(), "mault-prerender-"));
      try {
        const { envSignature, pages } = await prerenderPages(
          root,
          configFile,
          ssrOutDir,
          MARKETING_PAGES.map((page) => page.path),
        );
        for (const page of MARKETING_PAGES) {
          const meta = readPageMeta(root, page.namespace, page.metaPath);
          const html = withPrerenderedApp(
            withPageMeta(template, page.path, meta),
            page.path,
            envSignature,
            pages[page.path],
          );
          const file =
            page.path === "/" ? "index.html" : `${page.path.slice(1)}.html`;
          writeFileSync(path.join(outDir, file), html);
        }
      } finally {
        rmSync(ssrOutDir, { recursive: true, force: true });
      }
    },
  };
}
