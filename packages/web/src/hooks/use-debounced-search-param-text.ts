import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { writeTextSearchParam } from "@/lib/card-search-params";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { DebouncedSearchParamTextOptions } from "@/lib/interfaces/cards";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useDebouncedSearchParamText(
  paramName: string,
  {
    isPersistedInUrl = true,
    paramNamesClearedOnChange,
  }: DebouncedSearchParamTextOptions = {},
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const textInUrl = isPersistedInUrl ? (searchParams.get(paramName) ?? "") : "";
  const [text, setText] = useState(textInUrl);
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const textInUrlRef = useRef(textInUrl);
  const handledDebouncedTextRef = useRef(debouncedText);

  useEffect(() => {
    if (!isPersistedInUrl) return;
    if (textInUrl === textInUrlRef.current) return;
    textInUrlRef.current = textInUrl;
    setText(textInUrl);
  }, [isPersistedInUrl, textInUrl]);

  useEffect(() => {
    if (!isPersistedInUrl) return;
    if (debouncedText === handledDebouncedTextRef.current) return;
    handledDebouncedTextRef.current = debouncedText;
    if (debouncedText === textInUrlRef.current) return;
    textInUrlRef.current = debouncedText;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        writeTextSearchParam(next, paramName, debouncedText);
        for (const clearedParamName of paramNamesClearedOnChange ?? []) {
          next.delete(clearedParamName);
        }
        return next;
      },
      { replace: true },
    );
  }, [
    isPersistedInUrl,
    debouncedText,
    paramName,
    paramNamesClearedOnChange,
    setSearchParams,
  ]);

  return { text, setText, debouncedText };
}
