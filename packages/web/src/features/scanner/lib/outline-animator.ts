import { drawDetectionOverlay } from "@/features/scanner/lib/card-detection";
import type { OutlineAnimator } from "@/lib/interfaces/scanner";
import {
  isOutlineSettled,
  stepOutline,
  type CardContour,
  type OutlineAnimationState,
} from "@magic-vault/shared";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function createOutlineAnimator(
  getCanvas: () => HTMLCanvasElement | null,
): OutlineAnimator {
  let state: OutlineAnimationState = { contour: null, opacity: 0 };
  let target: CardContour | null = null;
  let frame = 0;
  let lastTime = 0;

  const draw = () => {
    const canvas = getCanvas();
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.contour || state.opacity <= 0.01) return;
    ctx.globalAlpha = state.opacity;
    drawDetectionOverlay(ctx, {
      detected: true,
      contour: state.contour,
      confidence: 1,
    });
    ctx.globalAlpha = 1;
  };

  const step = (now: number) => {
    const dt = lastTime ? now - lastTime : 16;
    lastTime = now;
    state = stepOutline(state, target, dt, prefersReducedMotion());
    if (isOutlineSettled(state, target)) {
      state = target ? { contour: target, opacity: 1 } : { contour: null, opacity: 0 };
      draw();
      frame = 0;
      lastTime = 0;
      return;
    }
    draw();
    frame = requestAnimationFrame(step);
  };

  return {
    setTarget(contour) {
      target = contour;
      if (frame) return;
      lastTime = 0;
      frame = requestAnimationFrame(step);
    },
    cancel() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      target = null;
      state = { contour: null, opacity: 0 };
    },
  };
}
