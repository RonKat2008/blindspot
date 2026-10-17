import * as THREE from "three";
import type { Idea, SessionState } from "@/lib/contract";
import { disposeGlowTexture, disposeObject, getGlowTexture, makeTextSprite } from "./sprites";

const RADIUS = 3;
const MAX_POINTS = 60;
const MAX_EDGES = 150;
const YAW_SPREAD = THREE.MathUtils.degToRad(100); // ±100° → 200° arc
const PITCH_SPREAD = THREE.MathUtils.degToRad(35);
const SPAWN_MS = 700;
const ORIENTATION_SMOOTHING = 0.18;
const TAP_SLOP_PX = 8;
const AMBER = 0xf5b041;
const INK_BLUE = "#1d3a8a";
const FALLBACK_COLORS = ["#7dd3fc", "#f0abfc", "#86efac", "#fca5a5", "#c4b5fd", "#fde68a"];

type PointEntry = {
  id: string;
  group: THREE.Group;
  sphere: THREE.Mesh;
  target: THREE.Vector3;
  born: number;
};

export type ArSceneOptions = {
  onPick: (ideaId: string) => void;
};

export type ArScene = {
  update(state: SessionState): void;
  setPaused(paused: boolean): void;
  /** Starts listening to device orientation. Call after permission is granted. */
  enableOrientation(): void;
  hasOrientation(): boolean;
  pointCount(): number;
  dispose(): void;
};

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** Lens scores → point on the viewer-centred shell. -Z is "straight ahead" on load. */
function shellPosition(x: number, y: number, radius = RADIUS): THREE.Vector3 {
  const yaw = clamp1(x) * YAW_SPREAD;
  const pitch = clamp1(y) * PITCH_SPREAD;
  return new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * radius,
    Math.sin(pitch) * radius,
    -Math.cos(yaw) * Math.cos(pitch) * radius,
  );
}

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

function ideaLabel(idea: Idea): string {
  if (idea.text.trim()) return idea.text;
  if (idea.mediaType === "image") return "📷 photo";
  if (idea.mediaType === "audio") return "🎙 voice note";
  return "idea";
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ---- DeviceOrientationControls math (removed from three core; reimplemented inline) ----
const ZEE = new THREE.Vector3(0, 0, 1);
const Q_SCREEN_TILT = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X
const tmpEuler = new THREE.Euler();
const tmpQ = new THREE.Quaternion();

function orientationQuaternion(out: THREE.Quaternion, alpha: number, beta: number, gamma: number, orient: number) {
  tmpEuler.set(beta, alpha, -gamma, "YXZ");
  out.setFromEuler(tmpEuler);
  out.multiply(Q_SCREEN_TILT);
  out.multiply(tmpQ.setFromAxisAngle(ZEE, -orient));
}

function screenAngle(): number {
  const angle = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
  return THREE.MathUtils.degToRad(angle || 0);
}

export function createArScene(canvas: HTMLCanvasElement, { onPick }: ArSceneOptions): ArScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
  camera.rotation.order = "YXZ";
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const pointsRoot = new THREE.Group();
  const overlayRoot = new THREE.Group(); // gap ring, lens poles, question card
  scene.add(pointsRoot, overlayRoot);

  const entries = new Map<string, PointEntry>();
  let edgePairs: [PointEntry, PointEntry][] = [];
  const edgeGeo = new THREE.BufferGeometry();
  const edgeLines = new THREE.LineSegments(
    edgeGeo,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  scene.add(edgeLines);

  let gapGroup: THREE.Group | null = null;
  let polesGroup: THREE.Group | null = null;
  let polesKey = "";
  let card: THREE.Sprite | null = null;
  let cardKey = "";
  let cardHidden = false;

  // ---- sizing ----
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // ---- look controls: device orientation, else drag ----
  let orientationOn = false;
  let gotOrientation = false;
  let alphaOffset: number | null = null;
  const targetQ = new THREE.Quaternion();
  let dragYaw = 0;
  let dragPitch = 0;

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    const alpha = THREE.MathUtils.degToRad(e.alpha);
    if (alphaOffset == null) alphaOffset = -alpha; // face the ideas on first reading
    orientationQuaternion(
      targetQ,
      alpha + alphaOffset,
      THREE.MathUtils.degToRad(e.beta),
      THREE.MathUtils.degToRad(e.gamma),
      screenAngle(),
    );
    if (!gotOrientation) camera.quaternion.copy(targetQ);
    gotOrientation = true;
  };

  let pointerDown: { x: number; y: number; yaw: number; pitch: number; id: number } | null = null;
  let moved = false;
  const onPointerDown = (e: PointerEvent) => {
    pointerDown = { x: e.clientX, y: e.clientY, yaw: dragYaw, pitch: dragPitch, id: e.pointerId };
    moved = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!pointerDown || e.pointerId !== pointerDown.id) return;
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    if (Math.hypot(dx, dy) > TAP_SLOP_PX) moved = true;
    if (gotOrientation) return;
    const perPx = THREE.MathUtils.degToRad(camera.fov) / (canvas.clientHeight || 600);
    dragYaw = pointerDown.yaw + dx * perPx;
    dragPitch = THREE.MathUtils.clamp(pointerDown.pitch + dy * perPx, -1.2, 1.2);
  };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onPointerUp = (e: PointerEvent) => {
    if (!pointerDown || e.pointerId !== pointerDown.id) return;
    pointerDown = null;
    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (card && !cardHidden && raycaster.intersectObject(card).length) {
      cardHidden = true;
      return;
    }
    const spheres = [...entries.values()].map((p) => p.sphere);
    const hit = raycaster.intersectObjects(spheres, false)[0];
    // Generous fallback: nearest point within ~6° of the ray, since spheres are small on phones.
    if (hit) return onPick(hit.object.userData.ideaId as string);
    let best: { id: string; angle: number } | null = null;
    for (const p of entries.values()) {
      const dir = p.group.position.clone().sub(raycaster.ray.origin).normalize();
      const angle = dir.angleTo(raycaster.ray.direction);
      if (angle < 0.1 && (!best || angle < best.angle)) best = { id: p.id, angle };
    }
    if (best) onPick(best.id);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", () => (pointerDown = null));

  // ---- content ----
  function addPoint(idea: Idea, target: THREE.Vector3, delay: number): PointEntry {
    const color = new THREE.Color(idea.color || hashColor(idea.id));
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 20, 14),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 }),
    );
    sphere.userData.ideaId = idea.id;
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(0.45);
    const label = makeTextSprite(ideaLabel(idea), { maxCharsPerLine: 22, maxLines: 2, lineHeight: 0.07 });
    label.position.y = -0.11 - label.scale.y / 2;
    group.add(glow, sphere, label);
    group.position.copy(target);
    group.scale.setScalar(0.0001);
    pointsRoot.add(group);
    return { id: idea.id, group, sphere, target: target.clone(), born: performance.now() + delay };
  }

  function updateGap(coords: { x: number; y: number }[]) {
    if (gapGroup) {
      overlayRoot.remove(gapGroup);
      disposeObject(gapGroup);
      gapGroup = null;
    }
    if (coords.length < 3) return;
    const quads = [
      { sx: -1, sy: -1, n: 0 },
      { sx: 1, sy: -1, n: 0 },
      { sx: -1, sy: 1, n: 0 },
      { sx: 1, sy: 1, n: 0 },
    ];
    for (const c of coords) quads[(c.x >= 0 ? 1 : 0) + (c.y >= 0 ? 2 : 0)].n++;
    const empty = quads.reduce((a, b) => (b.n < a.n ? b : a));
    if (empty.n > Math.max(1, coords.length * 0.1)) return;
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 64), ringMat);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 48),
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: getGlowTexture(), color: AMBER, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.scale.setScalar(1.6);
    const facing = new THREE.Group();
    facing.add(disc, ring);
    const label = makeTextSprite(empty.n === 0 ? "nobody's been here yet" : "almost nobody's been here", {
      color: "#fde3b0",
      lineHeight: 0.08,
      maxLines: 1,
      maxCharsPerLine: 40,
    });
    label.position.y = -0.62;
    g.add(halo, facing, label);
    g.position.copy(shellPosition(empty.sx * 0.55, empty.sy * 0.55, RADIUS * 1.05));
    facing.lookAt(0, 0, 0);
    g.userData.ring = ring;
    overlayRoot.add(g);
    gapGroup = g;
  }

  function updatePoles(state: SessionState) {
    const axes = [...state.axes].sort((a, b) => a.position - b.position).slice(0, 2);
    const key = axes.map((a) => `${a.poleA}|${a.poleB}`).join("/");
    if (key === polesKey) return;
    polesKey = key;
    if (polesGroup) {
      overlayRoot.remove(polesGroup);
      disposeObject(polesGroup);
    }
    polesGroup = new THREE.Group();
    const opts = { color: "rgba(255,255,255,0.55)", lineHeight: 0.06, maxLines: 1, maxCharsPerLine: 30, weight: 500 };
    const place = (text: string, x: number, y: number) => {
      const s = makeTextSprite(text, opts);
      s.position.copy(shellPosition(x, y, RADIUS * 1.15));
      polesGroup?.add(s);
    };
    if (axes[0]) {
      place(`◂ ${axes[0].poleA}`, -1.08, 0);
      place(`${axes[0].poleB} ▸`, 1.08, 0);
    }
    if (axes[1]) {
      place(`▴ ${axes[1].poleB}`, 0, 1.2);
      place(`▾ ${axes[1].poleA}`, 0, -1.2);
    }
    overlayRoot.add(polesGroup);
  }

  function updateCard(state: SessionState) {
    const open = [...state.provocations].reverse().find((p) => p.status === "shown");
    const key = open?.id ?? "";
    if (key === cardKey) return;
    cardKey = key;
    cardHidden = false;
    if (card) {
      overlayRoot.remove(card);
      disposeObject(card);
      card = null;
    }
    if (!open) return;
    card = makeTextSprite(open.text, {
      background: INK_BLUE,
      border: "rgba(255,255,255,0.35)",
      maxCharsPerLine: 30,
      maxLines: 4,
      lineHeight: 0.085,
      padding: 34,
      weight: 600,
    });
    card.position.set(0, 0.25, -1.8);
    card.renderOrder = 10;
    overlayRoot.add(card);
  }

  function update(state: SessionState) {
    const axes = [...state.axes].sort((a, b) => a.position - b.position);
    const ax = axes[0]?.id;
    const ay = axes[1]?.id;
    const ideas = state.ideas.slice(-MAX_POINTS);
    const coords: { x: number; y: number }[] = [];
    const seen = new Set<string>();
    let newIndex = 0;
    for (const idea of ideas) {
      const x = ax ? (idea.axisScores[ax] ?? 0) : 0;
      const y = ay ? (idea.axisScores[ay] ?? 0) : 0;
      coords.push({ x: clamp1(x), y: clamp1(y) });
      const target = shellPosition(x, y);
      seen.add(idea.id);
      const existing = entries.get(idea.id);
      if (existing) existing.target.copy(target);
      else entries.set(idea.id, addPoint(idea, target, newIndex++ * 60));
    }
    for (const [id, entry] of entries) {
      if (seen.has(id)) continue;
      pointsRoot.remove(entry.group);
      disposeObject(entry.group);
      entries.delete(id);
    }
    edgePairs = (state.edges ?? [])
      .filter((e) => entries.has(e.a) && entries.has(e.b))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_EDGES)
      .map((e) => [entries.get(e.a)!, entries.get(e.b)!]);
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edgePairs.length * 6), 3));
    updateGap(coords);
    updatePoles(state);
    updateCard(state);
  }

  // ---- loop ----
  let raf = 0;
  let paused = false;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    if (gotOrientation) camera.quaternion.slerp(targetQ, ORIENTATION_SMOOTHING);
    else {
      tmpEuler.set(dragPitch, dragYaw, 0, "YXZ");
      tmpQ.setFromEuler(tmpEuler);
      camera.quaternion.slerp(tmpQ, 0.35);
    }
    for (const p of entries.values()) {
      const t = Math.min(1, Math.max(0, (now - p.born) / SPAWN_MS));
      p.group.scale.setScalar(Math.max(0.0001, easeOutBack(t)));
      p.group.position.lerp(p.target, 0.08);
    }
    const pos = edgeGeo.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (pos) {
      edgePairs.forEach(([a, b], i) => {
        pos.setXYZ(i * 2, a.group.position.x, a.group.position.y, a.group.position.z);
        pos.setXYZ(i * 2 + 1, b.group.position.x, b.group.position.y, b.group.position.z);
      });
      pos.needsUpdate = true;
    }
    if (gapGroup) {
      const ring = gapGroup.userData.ring as THREE.Mesh;
      ring.scale.setScalar(1 + Math.sin(now / 500) * 0.06);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(now / 500) * 0.15;
    }
    if (card) {
      const m = card.material as THREE.SpriteMaterial;
      m.opacity += ((cardHidden ? 0 : 1) - m.opacity) * 0.12;
      card.visible = m.opacity > 0.02;
      card.position.y = 0.25 + Math.sin(now / 900) * 0.02;
    }
    renderer.render(scene, camera);
  };
  const start = () => {
    if (!raf && !paused) raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  start();

  return {
    update,
    setPaused(p) {
      paused = p;
      if (p) stop();
      else start();
    },
    enableOrientation() {
      if (orientationOn) return;
      orientationOn = true;
      window.addEventListener("deviceorientation", onOrientation);
    },
    hasOrientation: () => gotOrientation,
    pointCount: () => entries.size,
    dispose() {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("deviceorientation", onOrientation);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      disposeObject(scene);
      disposeGlowTexture();
      renderer.dispose();
    },
  };
}
