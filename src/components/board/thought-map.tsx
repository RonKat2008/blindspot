"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Axis, Idea } from "@/lib/contract";
import type { Cluster, Edge, HumanLink, PlotBox, QuadKey } from "./board-utils";
import { lensPoint } from "./board-utils";
import { forceLayout, type Vec } from "./force-layout";
import { ConnectionsLayer, LensGrid } from "./layers";
import { Point, type PointMedia } from "./point";

export type MapItem = {
  key: string;
  id: string;
  text: string;
  color: string;
  idea?: Idea;
  media?: PointMedia;
  isPending: boolean;
  isFresh: boolean;
};

type Lens = { box: PlotBox; xAxis: Axis; yAxis: Axis; occupied: Set<QuadKey>; quad: QuadKey | null; onQuad: (q: QuadKey | null) => void } | null;

/** Space kept clear for the bottom input bar and the right-hand question note. */
function boundsFor(w: number, h: number, noteOpen: boolean) {
  const right = w - (w < 640 ? 24 : 64) - (noteOpen && w >= 1024 ? 380 : 0);
  return { left: w < 640 ? 24 : 56, top: 48, right: Math.max(160, right), bottom: Math.max(140, h - (w < 640 ? 150 : 120)) };
}

/** Labels flip to the left of the dot when they would run off the right edge. */
function shouldFlip(x: number, w: number, compact: boolean): boolean {
  const label = w < 640 ? 160 : compact ? 150 : 200;
  return x + label > w - 8;
}

export function ThoughtMap({
  items,
  edges,
  clusters,
  links,
  islands,
  size,
  lens,
  noteOpen,
  showConn,
  highlight,
  selectedId,
  hoverId,
  canDrag,
  onHover,
  onSelect,
  onPin,
  onRemoveLink,
}: {
  items: MapItem[];
  edges: Edge[];
  clusters: Cluster[];
  links: HumanLink[];
  islands: Set<string>;
  size: { w: number; h: number };
  lens: Lens;
  noteOpen: boolean;
  showConn: boolean;
  highlight: Set<string>;
  selectedId: string | null;
  hoverId: string | null;
  canDrag: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string, additive: boolean) => void;
  onPin: (id: string, norm: { x: number; y: number }) => void;
  onRemoveLink: (link: HumanLink) => void;
}) {
  // Warm-start cache: each layout starts from the last settled one, so adding an idea nudges
  // its neighbours instead of reshuffling the whole map. Lives outside render state on purpose.
  const [cache] = useState(() => new Map<string, Vec>());
  const ids = items.map((i) => i.id);
  const idKey = ids.join("|");
  const edgeKey = edges.map((e) => `${e.a}-${e.b}-${e.similarity.toFixed(2)}`).join("|") + links.map((l) => `${l.a}~${l.b}`).join("|");
  const pinKey = items.map((i) => (i.idea?.board ? `${i.id}:${i.idea.board.x.toFixed(3)},${i.idea.board.y.toFixed(3)}` : "")).join("|");
  const bounds = boundsFor(size.w, size.h, noteOpen);

  const layout = useMemo(() => {
    const pinned = new Map<string, Vec>();
    for (const i of items) {
      const b = i.idea?.board;
      if (b && b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1) pinned.set(i.id, { x: b.x * size.w, y: b.y * size.h });
    }
    const humanEdges = links.map((l) => ({ a: l.a, b: l.b, similarity: 0.8 }));
    // carry positions across the pending → saved id swap
    for (const i of items) if (!cache.has(i.id) && cache.has(i.key)) cache.set(i.id, cache.get(i.key) as Vec);
    const next = forceLayout({ ids, edges: [...edges, ...humanEdges], bounds, previous: cache, pinned });
    for (const [id, v] of next) cache.set(id, v);
    return next;
    // keyed on content signatures rather than array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, edgeKey, pinKey, bounds.left, bounds.top, bounds.right, bounds.bottom]);

  function positionOf(item: MapItem): Vec {
    if (lens && item.idea) {
      const p = lensPoint(item.idea, lens.xAxis.id, lens.yAxis.id, lens.box);
      return {
        x: Math.min(lens.box.left + lens.box.width - 8, Math.max(lens.box.left + 8, p.x)),
        y: Math.min(lens.box.top + lens.box.height - 8, Math.max(lens.box.top + 8, p.y)),
      };
    }
    if (lens) return { x: lens.box.left + lens.box.width / 2, y: lens.box.top + lens.box.height + 24 };
    return layout.get(item.id) ?? { x: size.w / 2, y: size.h / 2 };
  }

  const centers: Record<string, Vec> = {};
  for (const item of items) centers[item.id] = positionOf(item);
  const from = { x: size.w / 2 - 80, y: size.h - 40 };
  const neighbours = new Set<string>();
  const focus = hoverId ?? selectedId;
  if (focus) {
    for (const e of edges) {
      if (e.a === focus) neighbours.add(e.b);
      if (e.b === focus) neighbours.add(e.a);
    }
    for (const l of links) {
      if (l.a === focus) neighbours.add(l.b);
      if (l.b === focus) neighbours.add(l.a);
    }
  }

  return (
    <>
      <AnimatePresence>
        {lens ? (
          <LensGrid key="grid" box={lens.box} xAxis={lens.xAxis} yAxis={lens.yAxis} occupied={lens.occupied} selected={lens.quad} onSelect={lens.onQuad} />
        ) : null}
      </AnimatePresence>
      <ConnectionsLayer
        width={size.w}
        height={size.h}
        centers={centers}
        edges={edges}
        clusters={clusters}
        links={links}
        hoverId={focus}
        show={showConn}
        pendingLink={null}
        onRemoveLink={onRemoveLink}
      />
      {items.map((item) => {
        const pos = centers[item.id];
        const lit = highlight.has(item.id) || neighbours.has(item.id);
        const dim =
          (highlight.size > 0 && !highlight.has(item.id) && !neighbours.has(item.id)) ||
          (focus !== null && hoverId !== null && item.id !== focus && !neighbours.has(item.id)) ||
          Boolean(lens?.quad && item.idea && quadMatches(item.idea, lens) === false);
        return (
          <Point
            key={item.key}
            id={item.id}
            text={item.text}
            color={item.color}
            x={pos.x}
            y={pos.y}
            from={item.isFresh ? from : undefined}
            media={item.media}
            compact={Boolean(lens)}
            flip={shouldFlip(pos.x, size.w, Boolean(lens))}
            isPending={item.isPending}
            isSelected={selectedId === item.id}
            isLit={lit && selectedId !== item.id}
            isDimmed={dim}
            isIsland={islands.has(item.id)}
            isShortlisted={Boolean(item.idea?.shortlisted)}
            isAssumption={item.idea?.kind === "assumption"}
            canDrag={canDrag && !lens && !item.isPending}
            onHover={onHover}
            onSelect={onSelect}
            onDragEnd={(id, x, y) => onPin(id, { x: Math.max(0, Math.min(1, x / size.w)), y: Math.max(0, Math.min(1, y / size.h)) })}
          />
        );
      })}
    </>
  );
}

function quadMatches(idea: Idea, lens: NonNullable<Lens>): boolean {
  const x = idea.axisScores[lens.xAxis.id] ?? 0;
  const y = idea.axisScores[lens.yAxis.id] ?? 0;
  return `${y >= 0 ? "t" : "b"}${x >= 0 ? "r" : "l"}` === lens.quad;
}
