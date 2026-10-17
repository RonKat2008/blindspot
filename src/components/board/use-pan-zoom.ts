"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function isTyping(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || Boolean((el as HTMLElement | null)?.isContentEditable);
}

/**
 * Ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms around the pointer.
 * Space + drag pans. Plain two-finger scroll pans natively (the viewport scrolls).
 */
export function usePanZoom(viewportRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [zoom, setZoomState] = useState(1);
  const zoomRef = useRef(1);
  const [panning, setPanning] = useState(false);
  const space = useRef(false);

  function setZoom(next: number, anchor?: { x: number; y: number }) {
    const vp = viewportRef.current;
    const prev = zoomRef.current;
    const z = clampZoom(next);
    if (z === prev) return;
    zoomRef.current = z;
    setZoomState(z);
    if (!vp) return;
    const ax = anchor?.x ?? vp.clientWidth / 2;
    const ay = anchor?.y ?? vp.clientHeight / 2;
    const wx = (vp.scrollLeft + ax) / prev;
    const wy = (vp.scrollTop + ay) / prev;
    requestAnimationFrame(() => {
      vp.scrollLeft = wx * z - ax;
      vp.scrollTop = wy * z - ay;
    });
  }

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !enabled) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      setZoom(zoomRef.current * Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping()) {
        space.current = true;
        setPanning(true);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        space.current = false;
        setPanning(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!space.current) return;
      e.preventDefault();
      e.stopPropagation();
      const sx = e.clientX;
      const sy = e.clientY;
      const sl = vp.scrollLeft;
      const st = vp.scrollTop;
      const move = (ev: PointerEvent) => {
        vp.scrollLeft = sl - (ev.clientX - sx);
        vp.scrollTop = st - (ev.clientY - sy);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("pointerdown", onDown, { capture: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // setZoom only touches refs and stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportRef, enabled]);

  return { zoom: enabled ? zoom : 1, setZoom, panning };
}
