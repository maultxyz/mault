import { useCallback, useLayoutEffect, useRef, type Ref } from "react";

let generatedLabelCount = 0;

function labelIdsOfHiddenInput(control: HTMLElement) {
  const hiddenInput = control.nextElementSibling;
  if (!(hiddenInput instanceof HTMLInputElement) || !hiddenInput.labels) return "";
  return Array.from(hiddenInput.labels)
    .map((label) => {
      if (!label.id) {
        generatedLabelCount += 1;
        label.id = `control-label-${generatedLabelCount}`;
      }
      return label.id;
    })
    .join(" ");
}

export function useLabelledByHiddenInput<ControlElement extends HTMLElement>(
  forwardedRef: Ref<ControlElement> | undefined,
  hasExplicitName: boolean,
) {
  const controlRef = useRef<ControlElement | null>(null);

  useLayoutEffect(() => {
    const control = controlRef.current;
    if (!control || hasExplicitName) return;
    const labelIds = labelIdsOfHiddenInput(control);
    if (labelIds) control.setAttribute("aria-labelledby", labelIds);
    else control.removeAttribute("aria-labelledby");
  });

  return useCallback(
    (element: ControlElement | null) => {
      controlRef.current = element;
      if (typeof forwardedRef === "function") forwardedRef(element);
      else if (forwardedRef) forwardedRef.current = element;
    },
    [forwardedRef],
  );
}
