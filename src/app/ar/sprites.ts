import * as THREE from "three";

type TextSpriteOptions = {
  fontPx?: number;
  color?: string;
  background?: string;
  border?: string;
  maxCharsPerLine?: number;
  maxLines?: number;
  /** World-space height of one text line. */
  lineHeight?: number;
  padding?: number;
  weight?: number;
};

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 1)}…`;
    return kept;
  }
  return lines;
}

/** Canvas-texture sprite with wrapped text. Always faces the camera. */
export function makeTextSprite(text: string, opts: TextSpriteOptions = {}): THREE.Sprite {
  const {
    fontPx = 44,
    color = "#ffffff",
    background,
    border,
    maxCharsPerLine = 26,
    maxLines = 2,
    lineHeight = 0.09,
    padding = 18,
    weight = 600,
  } = opts;
  const lines = wrap(text || "…", maxCharsPerLine, maxLines);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();
  const font = `${weight} ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.font = font;
  const linePx = Math.round(fontPx * 1.25);
  const width = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2);
  const height = linePx * lines.length + padding * 2;
  canvas.width = width;
  canvas.height = height;
  ctx.font = font;
  if (background) {
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, Math.min(28, height / 2));
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  if (!background) {
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 8;
  }
  lines.forEach((l, i) => ctx.fillText(l, width / 2, padding + linePx * i + linePx / 2));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const worldH = (lineHeight * height) / linePx;
  sprite.scale.set((worldH * width) / height, worldH, 1);
  return sprite;
}

let glowTexture: THREE.CanvasTexture | null = null;

/** Shared soft radial glow (white; tint via material color). */
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

export function disposeGlowTexture() {
  glowTexture?.dispose();
  glowTexture = null;
}

/** Disposes geometries, materials and textures under an object. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      const map = (m as THREE.SpriteMaterial).map;
      if (map && map !== glowTexture) map.dispose();
      m.dispose();
    }
  });
}
