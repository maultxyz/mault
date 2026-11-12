import QRCode from "qrcode";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import { CONTROL_CARD_RENDER_LAYOUT } from "@/lib/constants/control-cards";
import type {
  ControlCardFace,
  ControlCardFrameText,
  ControlCardTextBlockLayout,
  ControlCardTextLineLayout,
} from "@/lib/interfaces/control-cards";

const layout = CONTROL_CARD_RENDER_LAYOUT;

async function loadImage(imagePath: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = imagePath;
  await image.decode();
  return image;
}

function fontFor(fontSize: number, isBold: boolean, fontFamily: string): string {
  return `${isBold ? "bold " : ""}${fontSize}px ${fontFamily}`;
}

function alignedX(left: number, width: number, align: CanvasTextAlign): number {
  return align === "center" ? left + width / 2 : left;
}

function drawTextLine(
  context: CanvasRenderingContext2D,
  text: string,
  line: ControlCardTextLineLayout,
  fontFamily: string,
) {
  context.font = fontFor(line.fontSize, line.isBold, fontFamily);
  context.textAlign = line.align;
  context.textBaseline = "middle";
  context.fillText(
    text,
    alignedX(line.left, line.maxWidth, line.align),
    line.centerY,
    line.maxWidth,
  );
}

function wrapParagraph(
  context: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let currentLine = "";
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    const candidateLine = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && context.measureText(candidateLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidateLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  paragraphs: string[],
  block: ControlCardTextBlockLayout,
  fontFamily: string,
) {
  let fontSize = block.maxFontSize;
  let wrappedParagraphs: string[][];
  let totalHeight: number;
  for (;;) {
    context.font = fontFor(fontSize, false, fontFamily);
    wrappedParagraphs = paragraphs.map((paragraph) =>
      wrapParagraph(context, paragraph, block.width),
    );
    const lineCount = wrappedParagraphs.reduce(
      (total, lines) => total + lines.length,
      0,
    );
    totalHeight =
      lineCount * fontSize * block.lineHeight +
      (paragraphs.length - 1) * fontSize * block.paragraphGap;
    const nextFontSize = fontSize - block.fontSizeStep;
    if (totalHeight <= block.height || nextFontSize < block.minFontSize) break;
    fontSize = nextFontSize;
  }
  context.textAlign = block.align;
  context.textBaseline = "top";
  const lineX = alignedX(block.left, block.width, block.align);
  let lineTop = block.top + Math.max(0, (block.height - totalHeight) / 2);
  for (const lines of wrappedParagraphs) {
    for (const line of lines) {
      context.fillText(line, lineX, lineTop, block.width);
      lineTop += fontSize * block.lineHeight;
    }
    lineTop += fontSize * block.paragraphGap;
  }
}

async function drawQrCode(
  context: CanvasRenderingContext2D,
  controlCodeText: string,
  left: number,
  top: number,
  size: number,
) {
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, controlCodeText, {
    errorCorrectionLevel: layout.qrErrorCorrectionLevel,
    margin: layout.qrMarginModules,
    width: size,
  });
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, left, top, size, size);
  context.imageSmoothingEnabled = true;
  releaseCanvases([qrCanvas]);
}

async function drawQrPlate(
  context: CanvasRenderingContext2D,
  controlCodeText: string,
) {
  const plate = layout.frame.qrPlate;
  const plateLeft = plate.centerX - plate.size / 2;
  const plateTop = plate.centerY - plate.size / 2;
  context.beginPath();
  context.roundRect(plateLeft, plateTop, plate.size, plate.size, plate.radius);
  context.fillStyle = layout.paperColor;
  context.fill();
  context.lineWidth = plate.borderWidth;
  context.strokeStyle = plate.borderColor;
  context.stroke();
  await drawQrCode(
    context,
    controlCodeText,
    plateLeft + plate.padding,
    plateTop + plate.padding,
    plate.size - plate.padding * 2,
  );
}

function drawFrameText(
  context: CanvasRenderingContext2D,
  text: ControlCardFrameText,
) {
  const { fontFamily } = layout.frame;
  context.fillStyle = layout.inkColor;
  drawTextLine(context, text.name, layout.frame.name, fontFamily);
  drawTextLine(context, text.typeLine, layout.frame.typeLine, fontFamily);
  drawTextBlock(context, text.rulesParagraphs, layout.frame.rules, fontFamily);
}

async function drawCardFace(
  context: CanvasRenderingContext2D,
  face: ControlCardFace,
  controlCodeText: string,
) {
  if (face.kind === "plain") {
    const { plain } = layout;
    context.fillStyle = layout.inkColor;
    drawTextLine(context, face.title, plain.title, plain.fontFamily);
    await drawQrCode(
      context,
      controlCodeText,
      plain.qrLeft,
      plain.qrTop,
      plain.qrSize,
    );
    context.fillStyle = layout.inkColor;
    drawTextBlock(context, face.actionLines, plain.actions, plain.fontFamily);
    return;
  }
  const cardImage = await loadImage(face.imagePath);
  context.drawImage(cardImage, 0, 0, layout.trimWidth, layout.trimHeight);
  if (face.kind === "frame") drawFrameText(context, face.text);
  await drawQrPlate(context, controlCodeText);
}

function drawCornerMarks(context: CanvasRenderingContext2D) {
  const { length, width, color } = layout.cornerMark;
  const corners = [
    { x: layout.bleed, y: layout.bleed, inwardX: 1, inwardY: 1 },
    { x: layout.bleed + layout.trimWidth, y: layout.bleed, inwardX: -1, inwardY: 1 },
    { x: layout.bleed, y: layout.bleed + layout.trimHeight, inwardX: 1, inwardY: -1 },
    {
      x: layout.bleed + layout.trimWidth,
      y: layout.bleed + layout.trimHeight,
      inwardX: -1,
      inwardY: -1,
    },
  ];
  context.fillStyle = color;
  for (const corner of corners) {
    const armStartX =
      corner.inwardX > 0 ? corner.x - width / 2 : corner.x - length + width / 2;
    const armStartY =
      corner.inwardY > 0 ? corner.y - width / 2 : corner.y - length + width / 2;
    context.fillRect(armStartX, corner.y - width / 2, length, width);
    context.fillRect(corner.x - width / 2, armStartY, width, length);
  }
}

export async function renderControlCard(
  face: ControlCardFace,
  controlCodeText: string,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = layout.trimWidth + layout.bleed * 2;
  canvas.height = layout.trimHeight + layout.bleed * 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.fillStyle =
    face.kind === "plain" ? layout.paperColor : layout.artworkBleedColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(layout.bleed, layout.bleed);
  await drawCardFace(context, face, controlCodeText);
  context.restore();
  drawCornerMarks(context);
  const dataUrl = canvas.toDataURL(layout.outputMimeType, layout.outputQuality);
  releaseCanvases([canvas]);
  return dataUrl;
}
