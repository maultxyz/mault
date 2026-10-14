import { useEffect } from "react";
import {
  DEFAULT_ROBOTS,
  NO_INDEX_ROBOTS,
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
    ];
    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
    };
  }, [title, description, path, noIndex]);
}
