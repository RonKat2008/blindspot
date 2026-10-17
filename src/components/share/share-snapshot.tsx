"use client";

/**
 * Usage (mount beside the board; the orchestrator wires the element):
 *
 *   <ShareSnapshot
 *     state={state}
 *     getBoardElement={() => document.getElementById("board")}
 *   />
 *
 * "Share recap" opens a sheet: download a PNG of the board plus a footer,
 * copy a markdown recap, or copy the board link. Toasts come from sonner.
 */

import { useId, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import type { SessionState } from "@/lib/contract";
import { boardLink, ledgerLine, rangeLabel, recapMarkdown } from "./recap";

type ShareSnapshotProps = {
  state: SessionState;
  getBoardElement: () => HTMLElement | null;
};

async function withFooter(boardPng: string, state: SessionState): Promise<string> {
  const image = await loadImage(boardPng);
  const footerH = 96;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height + footerH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#f7f1e6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  ctx.fillStyle = "#3a332c";
  const pad = 24;
  const question = state.session.prompt;
  ctx.font = "600 22px Fraunces, Georgia, serif";
  ctx.fillText(truncate(question, 72), pad, image.height + 36);
  ctx.font = "16px Geist, sans-serif";
  ctx.fillStyle = "#5c534c";
  ctx.fillText(`${rangeLabel(state)}  ·  ${ledgerLine(state)}`, pad, image.height + 68);
  return canvas.toDataURL("image/png");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  });
}

export function ShareSnapshot({ state, getBoardElement }: ShareSnapshotProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleId = useId();

  async function download() {
    const node = getBoardElement();
    if (!node) {
      toast.error("Couldn't find the board. Open the session and try again.");
      return;
    }
    setBusy(true);
    try {
      const png = await toPng(node, { cacheBust: true, pixelRatio: 2 });
      const stamped = await withFooter(png, state);
      const link = document.createElement("a");
      link.href = stamped;
      link.download = "blind-spot-recap.png";
      link.click();
      toast.success("Image downloaded.");
    } catch {
      toast.error("Couldn't make the image. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecap() {
    try {
      await navigator.clipboard.writeText(recapMarkdown(state));
      toast.success("Recap copied.");
    } catch {
      toast.error("Couldn't copy the recap. Try again.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(boardLink(state.session.id));
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link. Try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="rounded-md px-3 py-2 text-sm"
        style={{
          background: "var(--ink, oklch(22% 0.02 60))",
          color: "var(--paper, oklch(99% 0.006 85))",
          fontFamily: "var(--font-ui, sans-serif)",
        }}
        onClick={() => setOpen(true)}
      >
        Share recap
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: "oklch(22% 0.02 60 / 0.35)" }}
            aria-label="Close recap"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="relative m-0 w-full max-w-md rounded-t-2xl p-4 shadow-lg sm:rounded-2xl"
            style={{
              background: "var(--paper-raised, oklch(99% 0.006 85))",
              color: "var(--ink, oklch(22% 0.02 60))",
              fontFamily: "var(--font-ui, sans-serif)",
            }}
          >
            <h2
              id={titleId}
              className="m-0 text-xl"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Share this session
            </h2>
            <p className="mt-1 mb-4 text-sm" style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
              {rangeLabel(state)}. {ledgerLine(state)}.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-left text-sm"
                style={{ background: "var(--ink, oklch(22% 0.02 60))", color: "var(--paper, white)" }}
                onClick={() => void download()}
                disabled={busy}
              >
                {busy ? "Making image…" : "Download image"}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-left text-sm"
                style={{ borderColor: "var(--rule, oklch(86% 0.02 80))" }}
                onClick={() => void copyRecap()}
              >
                Copy recap
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-left text-sm"
                style={{ borderColor: "var(--rule, oklch(86% 0.02 80))" }}
                onClick={() => void copyLink()}
              >
                Copy link
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-2 text-left text-sm"
                style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
