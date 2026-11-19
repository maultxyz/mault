import type {
  FeatureHighlight,
  FeatureHighlightText,
} from "./interfaces/feature-highlight.interface";

export function normalizeFeatureHighlightSearchQuery(rawQuery: string): string {
  return rawQuery.trim().toLocaleLowerCase();
}

function searchableTextsOf(
  highlight: FeatureHighlight,
  resolveText: (text: FeatureHighlightText) => string,
): string[] {
  return highlight.slides.flatMap((slide) => [
    resolveText(slide.title),
    resolveText(slide.body),
    ...(slide.link ? [resolveText(slide.link.label)] : []),
    ...(slide.media ? [resolveText(slide.media.altText)] : []),
  ]);
}

export function featureHighlightMatchesSearch(
  highlight: FeatureHighlight,
  resolveText: (text: FeatureHighlightText) => string,
  rawQuery: string,
): boolean {
  const searchWords = normalizeFeatureHighlightSearchQuery(rawQuery)
    .split(/\s+/)
    .filter(Boolean);
  if (searchWords.length === 0) return true;
  const searchableText = searchableTextsOf(highlight, resolveText)
    .join("\n")
    .toLocaleLowerCase();
  return searchWords.every((word) => searchableText.includes(word));
}

export function filterFeatureHighlightsBySearch(
  highlights: readonly FeatureHighlight[],
  resolveText: (text: FeatureHighlightText) => string,
  rawQuery: string,
): FeatureHighlight[] {
  return highlights.filter((highlight) =>
    featureHighlightMatchesSearch(highlight, resolveText, rawQuery),
  );
}
