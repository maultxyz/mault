import {
  marketingOpenGraphImageAlt,
  marketingOpenGraphImagePath,
} from "@magic-vault/shared";
import { useEffect } from "react";
import { MARKETING_PAGES } from "@/lib/constants/marketing-pages";
import {
  DEFAULT_ROBOTS,
  NO_INDEX_ROBOTS,
  SITE_PUBLIC_API_URL,
  SITE_URL,
} from "@/lib/constants/seo";
import type { PageMeta } from "@/lib/interfaces/seo";

function setMeta(key: "name" | "property", name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${key}="${name}"]`,
  );
  const created = !element;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(key, name);
    document.head.appendChild(element);
  }
  const previous = element.content;
  element.content = content;
  return () => {
    if (created) element.remove();
    else element.content = previous;
  };
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  const created = !element;
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  const previous = element.href;
  element.href = href;
  return () => {
    if (created) element.remove();
    else element.href = previous;
  };
}

function openGraphImageMeta(path: string) {
  const page = MARKETING_PAGES.find((marketingPage) => marketingPage.path === path);
  if (!page) return [];
  const imageUrl = `${SITE_PUBLIC_API_URL}${marketingOpenGraphImagePath(page.openGraphImageKey)}`;
  const imageAlt = marketingOpenGraphImageAlt(page.openGraphImageKey);
  return [
    setMeta("property", "og:image", imageUrl),
    setMeta("property", "og:image:alt", imageAlt),
    setMeta("name", "twitter:image", imageUrl),
    setMeta("name", "twitter:image:alt", imageAlt),
  ];
}

export function usePageMeta({ title, description, path, noIndex }: PageMeta) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    const previousTitle = document.title;
    document.title = title;
    const restores = [
      setCanonical(url),
      setMeta("name", "description", description),
      setMeta("name", "robots", noIndex ? NO_INDEX_ROBOTS : DEFAULT_ROBOTS),
      setMeta("property", "og:title", title),
      setMeta("property", "og:description", description),
      setMeta("property", "og:url", url),
      setMeta("name", "twitter:title", title),
      setMeta("name", "twitter:description", description),
      ...openGraphImageMeta(path),
    ];
    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
    };
  }, [title, description, path, noIndex]);
}
