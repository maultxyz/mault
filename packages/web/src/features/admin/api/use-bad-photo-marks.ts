import { BAD_PHOTO_MARKS_STORAGE_KEY } from "@/lib/constants/admin";
import type { BadPhotoMarks } from "@/lib/interfaces/admin";
import { useCallback, useState } from "react";

function readMarks(): Set<string> {
  try {
    const stored = localStorage.getItem(BAD_PHOTO_MARKS_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function writeMarks(marks: Set<string>): void {
  try {
    localStorage.setItem(BAD_PHOTO_MARKS_STORAGE_KEY, JSON.stringify([...marks]));
  } catch {
    return;
  }
}

export function useBadPhotoMarks(): BadPhotoMarks {
  const [marks, setMarks] = useState(readMarks);

  const toggle = useCallback((scanId: string) => {
    setMarks((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId);
      else next.add(scanId);
      writeMarks(next);
      return next;
    });
  }, []);

  const isBad = useCallback((scanId: string) => marks.has(scanId), [marks]);

  return { isBad, toggle };
}
