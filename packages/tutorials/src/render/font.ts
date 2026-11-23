import { loadFont } from "@remotion/google-fonts/Figtree";

export const { fontFamily: tutorialFontFamily } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});
