import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import occtImportJs from "occt-import-js";
import { pruneStepOccurrences } from "./prune-step-occurrences.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const STEP_PATH = path.resolve(here, "../../../3d model/Card Sorter.step");
const CAMERA_MOUNT_STEP_PATH = path.resolve(here, "../../../3d model/Camera Mount.step");
const OUT_PATH = path.resolve(here, "../public/models/card-sorter.glb");

const TESSELLATION = {
  linearUnit: "millimeter",
  linearDeflectionType: "bounding_box_ratio",
  linearDeflection: 0.001,
  angularDeflection: 0.5,
};

const DEFAULT_COLOR = [0.92, 0.92, 0.9];

const FEEDER_EXCLUDED = new Set([
  "card tube",
  "card tube wall",
  "roller servo horn",
  "feeder base (flat, bearing version)",
  "roller servo horn (MG90S)",
  "feed roller (bearing version)",
  "hopper extension",
  "card weight",
  "card weight (small)",
]);

const FEEDER_ROLLER = "feed roller v2";

const BASE_EXCLUDED = new Set([
  "module alignment pin",
  "bin riser bottom",
  "bin riser top",
  "module riser",
  "module riser (short)",
  "ESP32 mount plate",
  "ESP32 breakout mount plate",
  "base frame module (tall)",
  "base frame module (tall, ESP32 breakout)",
  "servo test board mount plate",
  "card bin XL",
  "card bin XXL",
  "frame back plate (feeder)",
  "base enclosure back cover",
  "base enclosure back cover (bottom)",
  "card weight v2",
  "base frame module (ESP32 breakout)",
  "frame back plate (ESP32 breakout)",
  "base panel finger hole",
  "base panel esp",
  "all-in-one PCB",
  "all-in-one board mount plate",
  "base enclosure front",
  "base enclosure back",
]);

const MODULE_EXCLUDED = new Set([
  "",
  "wire jig",
  "card pusher left (old)",
  "card pusher right (old)",
  "camera mount",
  "side paddles servo horn (no spline)",
  "camera shroud (slim)",
  "card platform (staging version)",
]);
const UNUSED_ASSEMBLIES = new Set(["wing_step_export", "bin springs", "tools"]);
const TOP_PARTS = new Set(["camera shroud", "camera mount"]);
const PLATFORM_PARTS = new Set(["card platform"]);
const SERVO_PART = "micro servo";

const BASE_ROLES = {
  "base frame module#9": "baseBlock",
  "base frame module (tall, open)#0": "baseBlockTall",
  "base panel#0": "baseBlockTall",
  "Arduino mount plate#0": "groundFeeder",
  "frame back plate#0": "groundFeeder",
  "frame back plate (Arduino)#0": "groundFeeder",
  "servo controller mount plate#0": "groundFirst",
  "bin wing right#2": "groundFirst",
  "bin wing left#2": "groundFirst",
  "blank mount plate#0": "groundMiddle",
  "bin wing right#1": "groundMiddle",
  "bin wing left#1": "groundMiddle",
  "end mount plate#0": "groundEnd",
  "bin wing right#0": "groundEnd",
  "bin wing left#0": "groundEnd",
  "bin wing end#0": "groundEnd",
  "frame front plate#0": "groundEnd",
  "end card tray#0": "groundEnd",
  "card bin small#0": "sleeves",
  "card bin small#1": "sleeves",
};
const BASE_GENERATED = new Set(["base frame module", "card bin medium", "card bin large"]);

const PRINT_PARTS = {
  "camera shroud": "shroud",
  "camera mount": "shroud",
  "bin wing end": "endPlate",
  "frame back plate": "optionalPlate",
  "frame back plate (Arduino)": "optionalPlate",
  "frame front plate": "optionalPlate",
  "end card tray": "endBinPlate",
};

const BASE_PRINT_PARTS = {
  baseBlock: "baseSupport",
  baseBlockTall: "baseSupportTall",
  groundFeeder: "circuitBoardPlate",
  groundFirst: "servoControllerPlate",
  groundMiddle: "genericPlate",
  groundEnd: "endPlate",
  sleeves: "binsPlate",
};

const MODULE_ROLES = {
  "side paddles servo horn#0": "paddleHorn",
  "left paddle linkage#0": "rightPaddleLink",
  "right paddle linkage#0": "leftPaddleLink",
  "right paddle#0": "rightPaddle",
  "left paddle#0": "leftPaddle",
  "bottom paddle servo horn#0": "bottomHorn",
  "bottom paddle linkage#0": "bottomLink",
  "bottom paddle#0": "bottomPaddle",
  "pusher servo horn#0": "pusherHorn",
  "pusher linkage#0": "leftPusherLink",
  "pusher linkage#1": "rightPusherLink",
  "card pusher left#0": "leftPusher",
  "card pusher right#0": "rightPusher",
};

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function colorKey(color) {
  return (color ?? DEFAULT_COLOR).map((c) => c.toFixed(3)).join(",");
}

function isExcluded(name, excluded) {
  return excluded.has(name) || / \((snug|loose) fit\)$/.test(name);
}

function boundsMinimum(meshes) {
  const minimum = [Infinity, Infinity, Infinity];
  for (const mesh of meshes) {
    const positions = mesh.attributes.position.array;
    for (let i = 0; i < positions.length; i++) minimum[i % 3] = Math.min(minimum[i % 3], positions[i]);
  }
  return minimum;
}

function translateMeshes(meshes, offset) {
  for (const mesh of meshes) {
    const positions = mesh.attributes.position.array;
    for (let i = 0; i < positions.length; i++) positions[i] += offset[i % 3];
  }
}

function groupByColor(meshes) {
  const groups = new Map();
  for (const mesh of meshes) {
    const key = colorKey(mesh.color);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  }
  return groups;
}

function mergeMeshes(meshes) {
  let vertexCount = 0;
  let indexCount = 0;
  for (const mesh of meshes) {
    vertexCount += mesh.attributes.position.array.length / 3;
    indexCount += mesh.index.array.length;
  }
  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const index = new Uint32Array(indexCount);
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const mesh of meshes) {
    const p = mesh.attributes.position.array;
    position.set(p, vertexOffset * 3);
    if (mesh.attributes.normal) normal.set(mesh.attributes.normal.array, vertexOffset * 3);
    const idx = mesh.index.array;
    for (let i = 0; i < idx.length; i++) index[indexOffset + i] = idx[i] + vertexOffset;
    vertexOffset += p.length / 3;
    indexOffset += idx.length;
  }
  return { position, normal, index, vertexCount };
}

class GlbBuilder {
  constructor() {
    this.chunks = [];
    this.byteLength = 0;
    this.json = {
      asset: { version: "2.0", generator: "build-sorter-model" },
      extensionsUsed: ["KHR_mesh_quantization"],
      extensionsRequired: ["KHR_mesh_quantization"],
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [],
      meshes: [],
      materials: [],
      accessors: [],
      bufferViews: [],
      buffers: [],
    };
    this.materialIndex = new Map();
  }

  addBufferView(data, target, byteStride) {
    const padding = (4 - (this.byteLength % 4)) % 4;
    if (padding) {
      this.chunks.push(Buffer.alloc(padding));
      this.byteLength += padding;
    }
    const view = { buffer: 0, byteOffset: this.byteLength, byteLength: data.byteLength, target };
    if (byteStride) view.byteStride = byteStride;
    this.chunks.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    this.byteLength += data.byteLength;
    this.json.bufferViews.push(view);
    return this.json.bufferViews.length - 1;
  }

  addAccessor(accessor) {
    this.json.accessors.push(accessor);
    return this.json.accessors.length - 1;
  }

  material(key) {
    if (this.materialIndex.has(key)) return this.materialIndex.get(key);
    const rgb = key.split(",").map(Number).map(srgbToLinear);
    this.json.materials.push({
      name: key,
      pbrMetallicRoughness: {
        baseColorFactor: [...rgb, 1],
        metallicFactor: 0,
        roughnessFactor: 0.65,
      },
    });
    this.materialIndex.set(key, this.json.materials.length - 1);
    return this.json.materials.length - 1;
  }

  primitive(meshes, key) {
    const { position, normal, index, vertexCount } = mergeMeshes(meshes);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], position[i + k]);
        max[k] = Math.max(max[k], position[i + k]);
      }
    }
    const packedNormal = new Int8Array(vertexCount * 4);
    for (let i = 0; i < vertexCount; i++) {
      const x = normal[i * 3];
      const y = normal[i * 3 + 1];
      const z = normal[i * 3 + 2];
      const length = Math.hypot(x, y, z) || 1;
      packedNormal[i * 4] = Math.round((x / length) * 127);
      packedNormal[i * 4 + 1] = Math.round((y / length) * 127);
      packedNormal[i * 4 + 2] = Math.round((z / length) * 127);
    }
    const small = vertexCount < 65536;
    const indexData = small ? Uint16Array.from(index) : index;
    return {
      attributes: {
        POSITION: this.addAccessor({
          bufferView: this.addBufferView(position, 34962),
          componentType: 5126,
          count: vertexCount,
          type: "VEC3",
          min,
          max,
        }),
        NORMAL: this.addAccessor({
          bufferView: this.addBufferView(packedNormal, 34962, 4),
          componentType: 5120,
          normalized: true,
          count: vertexCount,
          type: "VEC3",
        }),
      },
      indices: this.addAccessor({
        bufferView: this.addBufferView(indexData, 34963),
        componentType: small ? 5123 : 5125,
        count: index.length,
        type: "SCALAR",
      }),
      material: this.material(key),
    };
  }

  meshNode(name, meshes) {
    const primitives = [...groupByColor(meshes)].map(([key, group]) => this.primitive(group, key));
    this.json.meshes.push({ name, primitives });
    this.json.nodes.push({ name, mesh: this.json.meshes.length - 1 });
    return this.json.nodes.length - 1;
  }

  groupNode(name, children) {
    this.json.nodes.push({ name, children });
    return this.json.nodes.length - 1;
  }

  write(rootNodes) {
    this.json.scenes[0].nodes = rootNodes;
    const binPadding = (4 - (this.byteLength % 4)) % 4;
    const bin = Buffer.concat([...this.chunks, Buffer.alloc(binPadding)]);
    this.json.buffers.push({ byteLength: bin.length });
    let jsonBuffer = Buffer.from(JSON.stringify(this.json));
    const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
    jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonBuffer.length + 8 + bin.length, 8);
    const chunkHeader = (length, type) => {
      const b = Buffer.alloc(8);
      b.writeUInt32LE(length, 0);
      b.writeUInt32LE(type, 4);
      return b;
    };
    return Buffer.concat([
      header,
      chunkHeader(jsonBuffer.length, 0x4e4f534a),
      jsonBuffer,
      chunkHeader(bin.length, 0x004e4942),
      bin,
    ]);
  }
}

const occt = await occtImportJs();
const prunedStep = pruneStepOccurrences(
  readFileSync(STEP_PATH, "latin1"),
  (name) =>
    UNUSED_ASSEMBLIES.has(name) ||
    [FEEDER_EXCLUDED, BASE_EXCLUDED, MODULE_EXCLUDED].some((excluded) => isExcluded(name, excluded)),
);
const result = occt.ReadStepFile(new Uint8Array(Buffer.from(prunedStep, "latin1")), TESSELLATION);
if (!result.success) throw new Error("Could not read the STEP file");
const cameraMountResult = occt.ReadStepFile(new Uint8Array(readFileSync(CAMERA_MOUNT_STEP_PATH)), TESSELLATION);
if (!cameraMountResult.success) throw new Error("Could not read the camera mount STEP file");
const cameraMount = cameraMountResult.meshes.filter((mesh) => mesh.name === "camera mount");
if (!cameraMount.length) throw new Error("Missing part: camera mount");

const nodeMeshes = (node) => node.meshes.map((index) => result.meshes[index]);
const searchNode = (node, name) =>
  node.name === name ? node : node.children.reduce((found, child) => found ?? searchNode(child, name), null);
const findNode = (name) => {
  const node = searchNode(result.root, name);
  if (!node) throw new Error(`Missing assembly node: ${name}`);
  return node;
};

const feederMeshes = nodeMeshes(findNode("feeder module")).filter((m) => !isExcluded(m.name, FEEDER_EXCLUDED));
const feeder = feederMeshes.filter((m) => m.name !== FEEDER_ROLLER && m.name !== SERVO_PART);
const feederServo = feederMeshes.filter((m) => m.name === SERVO_PART);
if (!feederServo.length) throw new Error("Missing feeder part: servo");
const feederRoller = feederMeshes.filter((m) => m.name === FEEDER_ROLLER);
if (!feederRoller.length) throw new Error("Missing feeder part: roller");
const baseMeshes = nodeMeshes(findNode("base")).filter((m) => !isExcluded(m.name, BASE_EXCLUDED));
const base = [];
const baseRoles = new Map();
const baseSeen = new Map();
for (const mesh of baseMeshes) {
  const occurrence = baseSeen.get(mesh.name) ?? 0;
  baseSeen.set(mesh.name, occurrence + 1);
  const role = BASE_ROLES[`${mesh.name}#${occurrence}`];
  if (role) {
    if (!baseRoles.has(role)) baseRoles.set(role, []);
    baseRoles.get(role).push(mesh);
  } else if (!BASE_GENERATED.has(mesh.name)) base.push(mesh);
}
const missingBase = [...new Set(Object.values(BASE_ROLES))].filter((role) => !baseRoles.has(role));
if (missingBase.length) throw new Error(`Missing base parts: ${missingBase.join(", ")}`);
const shortBlockMinimum = boundsMinimum(baseRoles.get("baseBlock"));
const tallBlockMinimum = boundsMinimum(baseRoles.get("baseBlockTall"));
translateMeshes(
  baseRoles.get("baseBlockTall"),
  shortBlockMinimum.map((value, axis) => value - tallBlockMinimum[axis]),
);
const templateMeshes = nodeMeshes(findNode("sorting module")).filter((m) => !isExcluded(m.name, MODULE_EXCLUDED));

const top = [...cameraMount];
const frame = [];
const platform = [];
const servos = [];
const roles = new Map();
const seen = new Map();
for (const mesh of templateMeshes) {
  const occurrence = seen.get(mesh.name) ?? 0;
  seen.set(mesh.name, occurrence + 1);
  const role = MODULE_ROLES[`${mesh.name}#${occurrence}`];
  if (TOP_PARTS.has(mesh.name)) top.push(mesh);
  else if (mesh.name === SERVO_PART) servos.push(mesh);
  else if (PLATFORM_PARTS.has(mesh.name)) platform.push(mesh);
  else if (role) {
    if (!roles.has(role)) roles.set(role, []);
    roles.get(role).push(mesh);
  } else frame.push(mesh);
}

const missing = [...new Set(Object.values(MODULE_ROLES))].filter((role) => !roles.has(role));
if (missing.length) throw new Error(`Missing module parts: ${missing.join(", ")}`);
if (!platform.length) throw new Error("Missing module part: platform");

const builder = new GlbBuilder();

function printGroup(name, meshes, fallback, extraChildren = []) {
  const parts = new Map();
  for (const mesh of meshes) {
    const part = PRINT_PARTS[mesh.name] ?? fallback;
    if (!parts.has(part)) parts.set(part, []);
    parts.get(part).push(mesh);
  }
  const children = [...parts].map(([part, group]) => builder.meshNode(`print-${part}`, group));
  return builder.groupNode(name, [...children, ...extraChildren]);
}

const moduleChildren = [
  builder.meshNode("frame", frame),
  builder.meshNode("servos", servos),
  builder.meshNode("platform", platform),
];
for (const [role, meshes] of roles) moduleChildren.push(builder.meshNode(role, meshes));

const glb = builder.write([
  printGroup("feeder", feeder, "feederModule", [
    builder.groupNode("feederRoller", [builder.meshNode("print-feederModule", feederRoller)]),
    builder.groupNode("feederServo", [builder.meshNode("print-hardware", feederServo)]),
  ]),
  ...(base.length ? [printGroup("base", base, "otherPrinted")] : []),
  ...[...baseRoles].map(([role, meshes]) => printGroup(role, meshes, BASE_PRINT_PARTS[role])),
  printGroup("top", top, "otherPrinted"),
  builder.groupNode("module", moduleChildren),
]);

mkdirSync(path.dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, glb);
process.stdout.write(`Static base parts: ${base.map((m) => m.name || "(unnamed)").join(", ") || "none"}
`);
process.stdout.write(`Wrote ${OUT_PATH} (${(glb.length / 1024 / 1024).toFixed(2)} MB)\n`);
