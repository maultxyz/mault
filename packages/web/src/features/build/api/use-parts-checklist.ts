import { BUILD_PARTS_CHECKLIST_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useEffect, useState } from "react";

export function usePartsChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILD_PARTS_CHECKLIST_STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(BUILD_PARTS_CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return { checked, toggle };
}
