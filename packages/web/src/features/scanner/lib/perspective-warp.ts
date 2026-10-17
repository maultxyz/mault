import {
  contourToPoints,
  solveHomographyDstToSrc,
  warpRgba,
  type CardContour,
} from "@magic-vault/shared";

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
  outputWidth: number,
  outputHeight: number,
): HTMLCanvasElement | null {
  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
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

  const h = homography;
  const mat3 = new Float32Array([h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], h[8]]);
  gl.uniformMatrix3fv(gl.getUniformLocation(program, "uHomography"), false, mat3);
  gl.uniform2f(gl.getUniformLocation(program, "uSourceSize"), source.width, source.height);
  gl.uniform1i(gl.getUniformLocation(program, "uSource"), 0);

  gl.viewport(0, 0, outputWidth, outputHeight);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return output;
}

function warpWithCpu(
  source: HTMLCanvasElement,
  homography: number[],
  outputWidth: number,
  outputHeight: number,
): HTMLCanvasElement {
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) throw new Error("Could not get canvas context");
  const sourceData = sourceCtx.getImageData(0, 0, source.width, source.height);
  const warped = warpRgba(sourceData, homography, outputWidth, outputHeight);

  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
  const outCtx = output.getContext("2d");
  if (!outCtx) throw new Error("Could not get canvas context");
  const outData = outCtx.createImageData(outputWidth, outputHeight);
  outData.data.set(warped.data);
  outCtx.putImageData(outData, 0, 0);
  return output;
}

export function dewarpCard(
  source: HTMLCanvasElement,
  contour: CardContour,
  outputWidth = 448,
  outputHeight = outputWidth,
): HTMLCanvasElement {
  const homography = solveHomographyDstToSrc(contourToPoints(contour));

  try {
    const warped = warpWithWebGl(source, homography, outputWidth, outputHeight);
    if (warped) return warped;
  } catch (err) {
    console.warn("[perspective-warp] WebGL warp failed, falling back to CPU:", err);
  }
  return warpWithCpu(source, homography, outputWidth, outputHeight);
}
