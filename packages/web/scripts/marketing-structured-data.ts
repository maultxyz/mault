import { readFileSync } from "fs";
import path from "path";
import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from "@magic-vault/shared";
import type { MarketingPageDefinition } from "../src/lib/interfaces/seo";
import {
  DESKTOP_OPERATING_SYSTEMS,
  SITE_HOME_BREADCRUMB_NAME,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_ORGANIZATION_ID,
  SITE_REPOSITORY_URL,
  SITE_SOFTWARE_ID,
  SITE_TITLE_SUFFIX_PATTERN,
  SITE_URL,
  SITE_WEBSITE_ID,
  SOFTWARE_APPLICATION_CATEGORY,
  SOFTWARE_FREE_PRICE,
  SOFTWARE_OPERATING_SYSTEMS,
  SOFTWARE_PRICE_CURRENCY,
  SUPPORTED_GAME_NAMES,
} from "../src/lib/constants/seo";

interface PageStructuredDataInput {
  root: string;
  page: MarketingPageDefinition;
  url: string;
  title: string;
  description: string;
  imageUrl: string;
}

function readLocale(root: string, namespace: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(root, "src/locales/en", `${namespace}.json`), "utf-8"),
  ) as Record<string, unknown>;
}

function titlesOf(entries: unknown): string[] {
  if (!entries || typeof entries !== "object") return [];
  return Object.values(entries as Record<string, unknown>).flatMap((entry) => {
    const title = (entry as Record<string, unknown> | null)?.title;
    return typeof title === "string" ? [title] : [];
  });
}

function nestedValue(source: Record<string, unknown>, keys: string[]): unknown {
  let value: unknown = source;
  for (const key of keys) value = (value as Record<string, unknown> | null)?.[key];
  return value;
}

function freeOffer() {
  return {
    "@type": "Offer",
    price: SOFTWARE_FREE_PRICE,
    priceCurrency: SOFTWARE_PRICE_CURRENCY,
  };
}

function breadcrumb(url: string, title: string) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_HOME_BREADCRUMB_NAME, item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title.replace(SITE_TITLE_SUFFIX_PATTERN, ""), item: url },
    ],
  };
}

function pageEntity({ root, page, url, title, description, imageUrl }: PageStructuredDataInput) {
  const common = { name: title, description, url, image: imageUrl, inLanguage: SITE_LANGUAGE };
  switch (page.structuredDataKind) {
    case "softwareApplication":
      return {
        "@type": "SoftwareApplication",
        "@id": SITE_SOFTWARE_ID,
        ...common,
        name: SITE_NAME,
        alternateName: title,
        applicationCategory: SOFTWARE_APPLICATION_CATEGORY,
        operatingSystem: SOFTWARE_OPERATING_SYSTEMS,
        isAccessibleForFree: true,
        offers: freeOffer(),
        publisher: { "@id": SITE_ORGANIZATION_ID },
        sameAs: [SITE_REPOSITORY_URL],
        about: SUPPORTED_GAME_NAMES.map((name) => ({ "@type": "Thing", name })),
      };
    case "softwareDownload":
      return {
        "@type": "SoftwareApplication",
        ...common,
        name: `${SITE_NAME} desktop app`,
        applicationCategory: SOFTWARE_APPLICATION_CATEGORY,
        operatingSystem: DESKTOP_OPERATING_SYSTEMS,
        downloadUrl: url,
        isAccessibleForFree: true,
        offers: freeOffer(),
        publisher: { "@id": SITE_ORGANIZATION_ID },
        isPartOf: { "@id": SITE_SOFTWARE_ID },
      };
    case "howTo":
      return {
        "@type": "HowTo",
        ...common,
        step: titlesOf(nestedValue(readLocale(root, page.namespace), ["assembly", "phases"])).map(
          (name, index) => ({ "@type": "HowToStep", position: index + 1, name, url: `${url}#assembly` }),
        ),
      };
    case "techArticle":
      return {
        "@type": "TechArticle",
        ...common,
        headline: title,
        author: { "@id": SITE_ORGANIZATION_ID },
        publisher: { "@id": SITE_ORGANIZATION_ID },
        articleSection: titlesOf(readLocale(root, page.namespace).sections),
      };
    case "webPage":
      return null;
  }
}

export function marketingPageStructuredData(input: PageStructuredDataInput): object {
  const isHome = input.url === `${SITE_URL}/`;
  const entity = pageEntity(input);
  const webPage = {
    "@type": "WebPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.title,
    description: input.description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": SITE_WEBSITE_ID },
    publisher: { "@id": SITE_ORGANIZATION_ID },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: input.imageUrl,
      width: OPEN_GRAPH_IMAGE_WIDTH,
      height: OPEN_GRAPH_IMAGE_HEIGHT,
    },
    ...(isHome ? {} : { breadcrumb: { "@id": `${input.url}#breadcrumb` } }),
    ...(entity ? { mainEntity: entity } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@graph": isHome ? [webPage] : [webPage, breadcrumb(input.url, input.title)],
  };
}

export function jsonLdScriptTag(value: object): string {
  const json = JSON.stringify(value).replace(
    /[<>&]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return `<script type="application/ld+json">${json}</script>`;
}
