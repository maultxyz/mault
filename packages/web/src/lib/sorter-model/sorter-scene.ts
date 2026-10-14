import { baseSupportBlocks } from "@/lib/sorter-model/base-support";
import { solveMechanism } from "@/lib/sorter-model/sorter-rig";
import { SERVOS } from "@/lib/constants/calibration";
import {
  SERVO_DEGREES_PER_SECOND,
  SERVO_TEST_STEP_MS,
  SORTER_MECHANISMS,
  SORTER_MODEL_CAMERA_FOV,
  SORTER_MODEL_FIT_PADDING,
  SORTER_MODEL_FOCUS_DISTANCE_MM,
  SORTER_MODEL_FOCUS_LERP,
  SORTER_MODEL_HIGHLIGHT_INTENSITY,
  SORTER_BASE_TEMPLATE_COLUMNS,
  SORTER_MODEL_CAD_MODULE_COUNT,
  SORTER_MODEL_PART_COLORS,
  SORTER_MODEL_SLOPE,
  SORTER_MODEL_URL,
  SORTER_MODEL_VIEW_DIRECTION,
  SORTER_MODULE_CENTER,
  SORTER_MODULE_SPACING_MM,
  SORTER_PRINT_ALT_LIGHTNESS,
  SORTER_PRINT_DEFAULT_PART,
  SORTER_PRINT_DIMMED_OPACITY,
  SORTER_PRINT_PART_COLORS,
  SORTER_FEEDER_ROLLER_NODE,
  SORTER_PRINT_PART_PATTERN,
  SORTER_XRAY_OPACITY,
} from "@/lib/constants/sorter-model";
import type { ServoName, SliderKey } from "@/lib/interfaces/calibration";
import type {
  SorterBaseNode,
  SorterFocus,
  SorterHotspotAnchor,
  SorterModelPart,
  SorterModelRole,
  SorterModuleRig,
  SorterPartPose,
  SorterPrintPart,
  SorterSceneOptions,
  SorterServoTargets,
  Vec3,
} from "@/lib/interfaces/sorter-model";
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const toVector = ([x, y, z]: Vec3) => new Vector3(x, y, z);

function servoRoles(servo: ServoName): SorterModelRole[] {
  const mechanism = SORTER_MECHANISMS[servo];
  return [
    mechanism.horn,
    ...mechanism.linkages.flatMap((linkage) => [
      linkage.coupler,
      linkage.rocker,
    ]),
  ];
}

const BASE_COLUMN_STEP = SORTER_MODEL_SLOPE[0] * SORTER_MODULE_SPACING_MM;
const BASE_LEVEL_STEP = -SORTER_MODEL_SLOPE[2] * SORTER_MODULE_SPACING_MM;

function moduleOffset(module: number) {
  return toVector(SORTER_MODEL_SLOPE).multiplyScalar(
    SORTER_MODULE_SPACING_MM * (module - 1),
  );
}

function partMaterial(part: SorterModelPart) {
  return new MeshStandardMaterial({
    color: new Color(SORTER_MODEL_PART_COLORS[part]),
    roughness: 0.6,
    metalness: 0,
  });
}

function paint(object: Object3D | undefined, material: MeshStandardMaterial) {
  object?.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const previous = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const old of previous) if (old !== material) old.dispose();
    child.material = material;
  });
}

function applyMaterial(object: Object3D, material: MeshStandardMaterial) {
  object.traverse((child) => {
    if (child instanceof Mesh) child.material = material;
  });
}

function isPrintPart(name: string): name is SorterPrintPart {
  return name in SORTER_PRINT_PART_COLORS;
}

function printPartOf(object: Object3D): SorterPrintPart {
  for (let node: Object3D | null = object; node; node = node.parent) {
    const name = SORTER_PRINT_PART_PATTERN.exec(node.name)?.[1];
    if (name) return isPrintPart(name) ? name : SORTER_PRINT_DEFAULT_PART;
  }
  return SORTER_PRINT_DEFAULT_PART;
}

function disposeObject(object: Object3D) {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) material.dispose();
  });
}

export class SorterScene {
  private readonly options: SorterSceneOptions;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly root = new Group();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly modules = new Map<number, SorterModuleRig>();
  private readonly angles = new Map<SliderKey, number>();
  private targets: SorterServoTargets = {};
  private moduleCount = SORTER_MODEL_CAD_MODULE_COUNT;
  private builtModuleCount = 0;
  private readonly base = new Group();
  private readonly baseTemplates = new Map<SorterBaseNode, Object3D>();
  private sleeveBounds: Box3 | null = null;
  private focus: SorterFocus | null = null;
  private template: Object3D | null = null;
  private cover: Object3D | null = null;
  private home: { position: Vector3; target: Vector3 } | null = null;
  private focusTarget: Vector3 | null = null;
  private focusPosition: Vector3 | null = null;
  private hotspots = new Map<string, SorterHotspotAnchor>();
  private readonly printMaterials = new Map<string, MeshStandardMaterial>();
  private breakoutHeight: number | null = null;
  private isolatedPart: SorterPrintPart | null = null;
  private readonly printMaterialParts = new Map<Material, SorterPrintPart>();
  private xray = false;
  private frame = 0;
  private lastTime = 0;
  private needsRender = true;
  private disposed = false;

  constructor(options: SorterSceneOptions) {
    this.options = options;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.className = "block size-full touch-none";
    options.container.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera(SORTER_MODEL_CAMERA_FOV, 1, 1, 10000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener("start", () => {
      this.focusTarget = null;
      this.focusPosition = null;
    });
    this.controls.addEventListener("change", () => {
      this.needsRender = true;
    });

    this.root.rotation.x = -Math.PI / 2;
    this.scene.add(this.root);
    this.scene.add(new HemisphereLight(0xffffff, 0x9aa0aa, 1.6));
    this.scene.add(new AmbientLight(0xffffff, 0.4));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(1, 2, 1.5);
    this.scene.add(key);
    const fill = new DirectionalLight(0xffffff, 0.8);
    fill.position.set(-1.5, 0.5, -1);
    this.scene.add(fill);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(options.container);
    this.resize();

    new GLTFLoader().load(
      SORTER_MODEL_URL,
      (gltf) => this.handleLoad(gltf.scene),
      undefined,
      (error) => {
        if (!this.disposed) options.onError(error);
      },
    );

    this.frame = requestAnimationFrame(this.tick);
  }

  setTargets(targets: SorterServoTargets) {
    this.targets = targets;
    this.needsRender = true;
  }

  setModuleCount(count: number) {
    this.moduleCount = Math.max(1, count);
    if (this.template && this.moduleCount !== this.builtModuleCount) {
      this.buildModules();
      this.frameModel();
    }
    this.needsRender = true;
  }

  setBreakoutHeight(height: number | null) {
    if (height === this.breakoutHeight) return;
    this.breakoutHeight = height;
    if (this.template) {
      this.buildBase(this.moduleCount);
      this.applyOpacity();
    }
    this.needsRender = true;
  }

  setIsolatedPart(part: SorterPrintPart | null) {
    this.isolatedPart = part;
    this.applyOpacity();
  }

  setXray(enabled: boolean) {
    this.xray = enabled;
    this.applyOpacity();
  }

  setFocus(focus: SorterFocus | null) {
    const changed = focus !== this.focus;
    this.focus = focus;
    this.applyHighlight();
    if (focus && changed && this.home) this.zoomToModule(focus.module);
    this.needsRender = true;
  }

  setHotspots(hotspots: Map<string, SorterHotspotAnchor>) {
    this.hotspots = hotspots;
    this.needsRender = true;
  }

  setCoverVisible(visible: boolean) {
    if (this.cover) this.cover.visible = visible;
    this.needsRender = true;
  }

  resetView() {
    if (!this.home) return;
    this.focusTarget = null;
    this.focusPosition = null;
    this.camera.position.copy(this.home.position);
    this.controls.target.copy(this.home.target);
    this.controls.update();
    this.needsRender = true;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    disposeObject(this.root);
    if (this.template) disposeObject(this.template);
    for (const template of this.baseTemplates.values()) {
      disposeObject(template);
    }
    for (const material of this.printMaterials.values()) material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private handleLoad(model: Object3D) {
    if (this.disposed) {
      disposeObject(model);
      return;
    }

    const template = model.getObjectByName("module");
    if (!template) {
      this.options.onError(new Error("The sorter model has no module"));
      return;
    }
    template.removeFromParent();
    this.template = template;
    const frame = partMaterial("frame");
    if (this.isPrint) {
      this.paintPrintParts(model);
      applyMaterial(template, this.printMaterial("sortingModule"));
      const servos = template.getObjectByName("servos");
      if (servos) applyMaterial(servos, this.printMaterial("hardware"));
    } else {
      const feeder = model.getObjectByName("feeder");
      const roller = feeder?.getObjectByName(SORTER_FEEDER_ROLLER_NODE);
      roller?.removeFromParent();
      paint(feeder, frame);
      if (roller) {
        paint(roller, partMaterial("feeder"));
        feeder?.add(roller);
      }
      paint(model.getObjectByName("top"), frame);
      paint(template.getObjectByName("frame"), frame);
      paint(template.getObjectByName("servos"), partMaterial("servo"));
      paint(template.getObjectByName("platform"), partMaterial("platform"));
    }
    this.cover = model.getObjectByName("top") ?? null;
    if (this.cover) this.cover.visible = false;

    for (const name of Object.keys(
      SORTER_BASE_TEMPLATE_COLUMNS,
    ) as SorterBaseNode[]) {
      const node = model.getObjectByName(name);
      if (!node) continue;
      node.removeFromParent();
      if (!this.isPrint) paint(node, frame);
      this.baseTemplates.set(name, node);
    }
    const sleeves = this.baseTemplates.get("sleeves");
    if (sleeves) {
      sleeves.updateMatrixWorld(true);
      this.sleeveBounds = new Box3().setFromObject(sleeves);
    }

    for (const child of [...model.children]) this.root.add(child);
    this.root.add(this.base);

    this.buildModules();
    this.frameModel();
    this.applyHighlight();
    this.needsRender = true;
    this.options.onLoad();
  }

  private get isPrint() {
    return this.options.palette === "print";
  }

  private printMaterial(part: SorterPrintPart, alt = false) {
    const key = `${part}:${alt ? "alt" : "main"}`;
    const existing = this.printMaterials.get(key);
    if (existing) return existing;
    const color = new Color(SORTER_PRINT_PART_COLORS[part]);
    if (alt) color.offsetHSL(0, 0, SORTER_PRINT_ALT_LIGHTNESS);
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0,
    });
    this.printMaterials.set(key, material);
    this.printMaterialParts.set(material, part);
    return material;
  }

  private paintPrintParts(model: Object3D) {
    const meshes: Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof Mesh) meshes.push(child);
    });
    for (const mesh of meshes) {
      const material = this.printMaterial(printPartOf(mesh));
      const previous = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const old of previous) if (old !== material) old.dispose();
      mesh.material = material;
    }
  }

  private buildModules() {
    const template = this.template;
    if (!template) return;
    const count = this.moduleCount;
    for (const [module, rig] of this.modules) {
      if (module <= count) continue;
      rig.group.removeFromParent();
      for (const material of rig.materials.values()) material.dispose();
      this.modules.delete(module);
    }
    for (let module = 1; module <= count; module++) {
      if (this.modules.has(module)) continue;
      const rig = this.createModule(template);
      rig.group.position.copy(moduleOffset(module));
      this.root.add(rig.group);
      this.modules.set(module, rig);
    }
    this.buildBase(count);
    this.builtModuleCount = count;
    this.applyHighlight();
    this.applyOpacity();
  }

  private buildBase(count: number) {
    this.base.clear();
    const extra = count - SORTER_MODEL_CAD_MODULE_COUNT;
    const ground = -extra * BASE_LEVEL_STEP;
    const place = (
      name: SorterBaseNode,
      column: number,
      z: number,
      scaleZ = 1,
    ) => {
      const template = this.baseTemplates.get(name);
      if (!template) return null;
      const copy = template.clone(true);
      copy.position.set(
        (column - SORTER_BASE_TEMPLATE_COLUMNS[name]) * BASE_COLUMN_STEP,
        0,
        z,
      );
      copy.scale.z = scaleZ;
      this.base.add(copy);
      return copy;
    };

    place("base", 0, ground);
    place("groundFeeder", 0, ground);
    if (count > 1) place("groundFirst", 1, ground);
    for (let column = 2; column < count; column++) {
      place("groundMiddle", column, ground);
    }
    place("groundEnd", count, ground);

    const blocks = baseSupportBlocks(count, this.breakoutHeight);
    for (let column = 0; column <= count; column++) {
      for (
        let level = -extra;
        level <= SORTER_MODEL_CAD_MODULE_COUNT - column;
        level++
      ) {
        const copy = place("baseBlock", column, level * BASE_LEVEL_STEP);
        const block = blocks[column]?.[level + extra];
        if (copy && block && this.isPrint) {
          applyMaterial(copy, this.printMaterial(block.part, block.alt));
        }
      }
    }

    const bounds = this.sleeveBounds;
    if (!bounds) return;
    const height = bounds.max.z - bounds.min.z;
    for (let module = 1; module <= count; module++) {
      const scale = (height + BASE_LEVEL_STEP * (count - module)) / height;
      place("sleeves", module, ground + bounds.min.z * (1 - scale), scale);
    }
  }

  private createModule(template: Object3D): SorterModuleRig {
    const group = template.clone(true);
    const parts = new Map<SorterModelRole, Object3D>();
    const materials = new Map<ServoName, MeshStandardMaterial>();
    if (this.isPrint) return { group, parts, materials };

    for (const { name: servo } of SERVOS) {
      const material = partMaterial(servo);
      for (const role of servoRoles(servo)) {
        const part = group.getObjectByName(role);
        if (!part) continue;
        part.matrixAutoUpdate = false;
        parts.set(role, part);
        part.traverse((child) => {
          if (child instanceof Mesh) child.material = material;
        });
      }
      materials.set(servo, material);
    }

    return { group, parts, materials };
  }

  private frameModel() {
    this.root.updateMatrixWorld(true);
    const sphere = new Box3()
      .setFromObject(this.root)
      .getBoundingSphere(new Sphere());
    const halfFov = (SORTER_MODEL_CAMERA_FOV * Math.PI) / 360;
    const distance =
      (sphere.radius / Math.sin(halfFov)) * SORTER_MODEL_FIT_PADDING;
    const position = toVector(SORTER_MODEL_VIEW_DIRECTION)
      .normalize()
      .multiplyScalar(distance)
      .add(sphere.center);

    this.camera.near = distance / 100;
    this.camera.far = distance * 10;
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = sphere.radius * 0.3;
    this.controls.maxDistance = distance * 3;
    this.home = { position, target: sphere.center.clone() };
    this.resetView();
  }

  private zoomToModule(module: number) {
    const target = this.root.localToWorld(
      toVector(SORTER_MODULE_CENTER).add(moduleOffset(module)),
    );
    const direction = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();
    this.focusTarget = target;
    this.focusPosition = direction
      .multiplyScalar(SORTER_MODEL_FOCUS_DISTANCE_MM)
      .add(target);
  }

  private applyOpacity() {
    const materials = new Set<Material>();
    this.root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const list = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of list) materials.add(material);
    });
    const isolated = this.isolatedPart;
    for (const material of materials) {
      const part = this.printMaterialParts.get(material);
      const picked = isolated !== null && part === isolated;
      const opacity =
        isolated !== null && !picked
          ? SORTER_PRINT_DIMMED_OPACITY
          : this.xray && !picked
            ? SORTER_XRAY_OPACITY
            : 1;
      if (material.opacity === opacity && material.transparent === opacity < 1)
        continue;
      material.transparent = opacity < 1;
      material.opacity = opacity;
      material.depthWrite = opacity === 1;
      material.needsUpdate = true;
    }
    this.needsRender = true;
  }

  private applyHighlight() {
    for (const [module, rig] of this.modules) {
      for (const [servo, material] of rig.materials) {
        const lit = this.focus?.module === module && this.focus.servo === servo;
        material.emissive.copy(material.color);
        material.emissiveIntensity = lit ? SORTER_MODEL_HIGHLIGHT_INTENSITY : 0;
      }
    }
  }

  private updateHotspots() {
    const { clientWidth, clientHeight } = this.options.container;
    const ready = this.home !== null;
    for (const { element, point, module } of this.hotspots.values()) {
      const local = toVector(point);
      if (module !== null) local.add(moduleOffset(module));
      const projected = this.root.localToWorld(local).project(this.camera);
      const visible =
        ready &&
        projected.z < 1 &&
        (module === null || module <= this.moduleCount);
      element.style.visibility = visible ? "visible" : "hidden";
      if (!visible) continue;
      const x = ((projected.x + 1) / 2) * clientWidth;
      const y = ((1 - projected.y) / 2) * clientHeight;
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  }

  private resize() {
    const { clientWidth, clientHeight } = this.options.container;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  private targetAngle(key: SliderKey, time: number) {
    const angles = this.targets[key]?.angles;
    if (!angles?.length) return 0;
    return angles[Math.floor(time / SERVO_TEST_STEP_MS) % angles.length];
  }

  private applyPose(
    rig: SorterModuleRig,
    servo: ServoName,
    poses: SorterPartPose[],
  ) {
    const mechanism = SORTER_MECHANISMS[servo];
    const axis = toVector(mechanism.axis);
    const right = toVector(mechanism.right);
    const up = toVector(mechanism.up);
    const toPoint = (x: number, y: number) =>
      right.clone().multiplyScalar(x).add(up.clone().multiplyScalar(y));

    for (const pose of poses) {
      const part = rig.parts.get(pose.role);
      if (!part) continue;
      const center = toPoint(pose.center[0], pose.center[1]);
      const moved = center.clone().add(toPoint(pose.offset[0], pose.offset[1]));
      part.matrix
        .makeTranslation(moved.x, moved.y, moved.z)
        .multiply(new Matrix4().makeRotationAxis(axis, pose.angle))
        .multiply(
          new Matrix4().makeTranslation(-center.x, -center.y, -center.z),
        );
      part.matrixWorldNeedsUpdate = true;
    }
  }

  private updateServos(time: number, delta: number) {
    if (this.isPrint) return false;
    let moving = false;
    for (const [module, rig] of this.modules) {
      if (!rig.group.visible) continue;
      for (const { name: servo } of SERVOS) {
        const key: SliderKey = `${module}:${servo}`;
        const target = this.targetAngle(key, time);
        const current = this.angles.get(key);
        let next = target;
        if (current !== undefined && !this.options.reducedMotion) {
          const step = SERVO_DEGREES_PER_SECOND * delta;
          next = current + Math.max(-step, Math.min(step, target - current));
        }
        if (next === current) continue;
        this.angles.set(key, next);
        this.applyPose(
          rig,
          servo,
          solveMechanism(SORTER_MECHANISMS[servo], next),
        );
        moving = true;
      }
    }
    return moving;
  }

  private updateFocus() {
    if (!this.focusTarget || !this.focusPosition) return false;
    const remaining =
      this.focusTarget.distanceTo(this.controls.target) +
      this.focusPosition.distanceTo(this.camera.position);
    if (remaining < 0.1 || this.options.reducedMotion) {
      this.controls.target.copy(this.focusTarget);
      this.camera.position.copy(this.focusPosition);
      this.focusTarget = null;
      this.focusPosition = null;
      return true;
    }
    this.controls.target.lerp(this.focusTarget, SORTER_MODEL_FOCUS_LERP);
    this.camera.position.lerp(this.focusPosition, SORTER_MODEL_FOCUS_LERP);
    return true;
  }

  private tick = (time: number) => {
    if (this.disposed) return;
    const delta = this.lastTime
      ? Math.min((time - this.lastTime) / 1000, 0.1)
      : 0;
    this.lastTime = time;

    const servosMoved = this.updateServos(time, delta);
    const focusMoved = this.updateFocus();
    const controlsMoved = this.controls.update();
    if (servosMoved || focusMoved || controlsMoved || this.needsRender) {
      this.needsRender = false;
      this.renderer.render(this.scene, this.camera);
      this.updateHotspots();
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}
