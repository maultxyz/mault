import type { CardContour } from "./scanner.interface";

export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MultiCardCandidate {
  contour: CardContour;
  confidence: number;
}
