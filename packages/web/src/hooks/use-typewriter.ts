import { DEMO_TYPEWRITER_MS_PER_CHARACTER } from "@/lib/constants/landing";
import { prefersReducedMotion } from "@/lib/motion";
import { useEffect, useState } from "react";

export function useTypewriter(
  fullText: string,
  isTyping: boolean,
  msPerCharacter = DEMO_TYPEWRITER_MS_PER_CHARACTER,
): string {
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (!isTyping) return;
    if (prefersReducedMotion()) {
      setTypedLength(fullText.length);
      return;
    }
    const intervalId = window.setInterval(() => {
      setTypedLength((length) => {
        if (length >= fullText.length) {
          window.clearInterval(intervalId);
          return length;
        }
        return length + 1;
      });
    }, msPerCharacter);
    return () => window.clearInterval(intervalId);
  }, [fullText, isTyping, msPerCharacter]);

  return fullText.slice(0, typedLength);
}
