import type { CardContour } from "@magic-vault/shared";

// Perspective-dewarps a detected card quadrilateral to a canonical square
// crop, matching CollectorVision's cv2.getPerspectiveTransform +
// warpPerspective (collector_vision/interfaces.py DetectionResult.dewarp).
// The Canvas 2D API only supports affine transforms, so there's no built-in
// equivalent - this computes the projective homography by hand and applies
// it via a WebGL fragment shader (falling back to a per-pixel JS sampler
// when WebGL is unavailable).

interface Point2 {
  x: number;
  y: number;
}

// Solves the homography H (dst -> src) that maps the destination unit
// square's four corners onto the four source corners, via direct linear
// transform on the standard 8-unknown projective system.
function solveHomographyDstToSrc(srcCorners: Point2[]): number[] {
  const dst: Point2[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  // A * h = b, h = [h0..h7], h33 implicitly 1.
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = srcCorners[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }

  const h = solveLinearSystem(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];

    const pivotVal = M[col][col];
    if (Math.abs(pivotVal) < 1e-12) {
      throw new Error("Degenerate quadrilateral - cannot solve homography");
    }
    for (let k = col; k <= n; k++) M[col][k] /= pivotVal;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (factor === 0) continue;
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }

  return M.map((row) => row[n]);
}

function contourToPoints(contour: CardContour): Point2[] {
  return [contour.topLeft, contour.topRight, contour.bottomRight, contour.bottomLeft];
}

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vDstCoord;
  void main() {
    vDstCoord = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vDstCoord;
  uniform sampler2D uSource;
  uniform mat3 uHomography;
  uniform vec2 uSourceSize;

  void main() {
    // vDstCoord.y is bottom-up (WebGL clip space); flip so (0,0) is the
    // dewarped crop's top-left, matching the corner order it was solved for.
    vec2 dst = vec2(vDstCoord.x, 1.0 - vDstCoord.y);
    vec3 src = uHomography * vec3(dst, 1.0);
    vec2 srcPixel = src.xy / src.z;
    vec2 uv = srcPixel / uSourceSize;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    gl_FragColor = texture2D(uSource, uv);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${info}`);
  }
  return shader;
}

function warpWithWebGl(
  source: HTMLCanvasElement,
  homography: number[],
  outputSize: number,
): HTMLCanvasElement | null {
  const output = document.createElement("canvas");
  output.width = outputSize;
  output.height = outputSize;
  const gl = output.getContext("webgl", { premultipliedAlpha: false });
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  gl.useProgram(program);

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

  // WebGL matrices are column-major; `homography` above is row-major, so
  // transpose it into the mat3 uniform layout.
  const h = homography;
  const mat3 = new Float32Array([h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], h[8]]);
  gl.uniformMatrix3fv(gl.getUniformLocation(program, "uHomography"), false, mat3);
  gl.uniform2f(gl.getUniformLocation(program, "uSourceSize"), source.width, source.height);
  gl.uniform1i(gl.getUniformLocation(program, "uSource"), 0);

  gl.viewport(0, 0, outputSize, outputSize);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return output;
}

function bilinearSample(
  imageData: ImageData,
  x: number,
  y: number,
): [number, number, number] {
  const { width, height, data } = imageData;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;

  const at = (px: number, py: number, channel: number) =>
    data[(py * width + px) * 4 + channel];

  const result: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const top = at(x0, y0, c) * (1 - fx) + at(x1, y0, c) * fx;
    const bottom = at(x0, y1, c) * (1 - fx) + at(x1, y1, c) * fx;
    result[c] = top * (1 - fy) + bottom * fy;
  }
  return result;
}

function warpWithCpu(
  source: HTMLCanvasElement,
  homography: number[],
  outputSize: number,
): HTMLCanvasElement {
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) throw new Error("Could not get canvas context");
  const sourceData = sourceCtx.getImageData(0, 0, source.width, source.height);

  const output = document.createElement("canvas");
  output.width = outputSize;
  output.height = outputSize;
  const outCtx = output.getContext("2d");
  if (!outCtx) throw new Error("Could not get canvas context");
  const outData = outCtx.createImageData(outputSize, outputSize);

  const h = homography;
  for (let dy = 0; dy < outputSize; dy++) {
    const ny = dy / outputSize;
    for (let dx = 0; dx < outputSize; dx++) {
      const nx = dx / outputSize;
      const w = h[6] * nx + h[7] * ny + h[8];
      const sx = (h[0] * nx + h[1] * ny + h[2]) / w;
      const sy = (h[3] * nx + h[4] * ny + h[5]) / w;

      const o = (dy * outputSize + dx) * 4;
      if (sx < 0 || sx > source.width - 1 || sy < 0 || sy > source.height - 1) {
        outData.data[o + 3] = 255;
        continue;
      }
      const [r, g, b] = bilinearSample(sourceData, sx, sy);
      outData.data[o] = r;
      outData.data[o + 1] = g;
      outData.data[o + 2] = b;
      outData.data[o + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return output;
}

export function dewarpCard(
  source: HTMLCanvasElement,
  contour: CardContour,
  outputSize = 448,
): HTMLCanvasElement {
  const homography = solveHomographyDstToSrc(contourToPoints(contour));

  try {
    const warped = warpWithWebGl(source, homography, outputSize);
    if (warped) return warped;
  } catch (err) {
    console.warn("[perspective-warp] WebGL warp failed, falling back to CPU:", err);
  }
  return warpWithCpu(source, homography, outputSize);
}
