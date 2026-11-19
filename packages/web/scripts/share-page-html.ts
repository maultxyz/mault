import {
  NO_INDEX_ROBOTS,
  SHARE_PREVIEW_SSI_DEFAULT_BLOCK,
  SHARE_PREVIEW_SSI_PATH,
} from "../src/lib/constants/seo";

const PAGE_META_TAG_PATTERN =
  /<title>[^<]*<\/title>|<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>|<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"\s+content="[^"]*"\s*\/?>/g;

function toShareFallbackTag(tag: string): string | null {
  if (tag.startsWith("<link")) return null;
  if (/\bname="robots"/.test(tag)) {
    return `<meta name="robots" content="${NO_INDEX_ROBOTS}" />`;
  }
  return tag;
}

export function sharePageHtml(template: string): string {
  const defaultTags = template.match(PAGE_META_TAG_PATTERN) ?? [];
  if (!defaultTags.some((tag) => tag.startsWith("<title>"))) {
    throw new Error("share-page-html: index.html has no <title>");
  }
  const fallbackTags = defaultTags.flatMap((tag) => toShareFallbackTag(tag) ?? []);
  let isFirstTag = true;
  return template.replace(PAGE_META_TAG_PATTERN, () => {
    if (!isFirstTag) return "";
    isFirstTag = false;
    return [
      `<!--# block name="${SHARE_PREVIEW_SSI_DEFAULT_BLOCK}" -->${fallbackTags.join("\n    ")}<!--# endblock -->`,
      `<!--# include virtual="${SHARE_PREVIEW_SSI_PATH}" stub="${SHARE_PREVIEW_SSI_DEFAULT_BLOCK}" -->`,
    ].join("\n    ");
  });
}
