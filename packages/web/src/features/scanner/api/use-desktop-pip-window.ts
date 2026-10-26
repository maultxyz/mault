import { DESKTOP_PIP_FRAME_NAME } from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";

function copyDocumentStyles(target: Document) {
  for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    target.head.appendChild(target.importNode(node, true));
  }
}

function syncRootAttributes(target: Document) {
  target.documentElement.className = document.documentElement.className;
  target.documentElement.style.colorScheme = document.documentElement.style.colorScheme;
  target.body.className = document.body.className;
}

export function useDesktopPipWindow(open: boolean, onClosed: () => void): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  useEffect(() => {
    if (!open || !window.maultDesktop) return;
    const popup = window.open("", DESKTOP_PIP_FRAME_NAME, "popup");
    if (!popup) return;
    const target = popup.document;
    target.title = document.title;
    copyDocumentStyles(target);
    syncRootAttributes(target);
    target.body.style.margin = "0";
    target.documentElement.style.height = "100%";
    target.body.style.height = "100%";
    const root = target.createElement("div");
    root.style.height = "100%";
    target.body.appendChild(root);

    const observer = new MutationObserver(() => syncRootAttributes(target));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    let closing = false;
    const handlePageHide = () => {
      setContainer(null);
      if (!closing) onClosedRef.current();
    };
    popup.addEventListener("pagehide", handlePageHide);
    setContainer(root);

    return () => {
      closing = true;
      observer.disconnect();
      popup.removeEventListener("pagehide", handlePageHide);
      setContainer(null);
      popup.close();
    };
  }, [open]);

  return container;
}
