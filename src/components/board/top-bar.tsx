"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AccountMenu } from "@/components/account/account-menu";
import { InviteButton } from "@/components/account/invite-button";
import type { Axis } from "@/lib/contract";
import { LensChips, PhoneQrButton } from "./board-header";

type MoreItem = { label: string; hint?: string; checked?: boolean; disabled?: boolean; onSelect: () => void };

export function TopBar({
  prompt,
  sessionId,
  scripted,
  axes,
  finding,
  savingAxes,
  lens,
  xId,
  yId,
  menu,
  onLens,
  onSaveAxes,
}: {
  prompt: string;
  sessionId: string | null;
  scripted: boolean;
  axes: Axis[];
  finding: boolean;
  savingAxes: boolean;
  lens: boolean;
  xId: string | null;
  yId: string | null;
  menu: MoreItem[];
  onLens: (next: boolean) => void;
  onSaveAxes: (axes: { id?: string; poleA: string; poleB: string }[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h1
          data-tour="question-heading"
          className="font-display min-w-0 text-[clamp(1.2rem,1rem+1vw,1.75rem)] leading-tight tracking-tight text-ink sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap"
          title={prompt}
        >
          {prompt}
        </h1>
        <div className="flex shrink-0 items-center gap-1">
          {sessionId && !scripted ? <InviteButton sessionId={sessionId} className="max-md:hidden" /> : null}
          {!scripted ? <PhoneQrButton sessionId={sessionId} /> : null}
          <div data-tour="lens-toggle" role="group" aria-label="View" className="flex rounded-xl border border-rule bg-paper-raised p-0.5">
            <Seg active={!lens} onClick={() => onLens(false)}>
              Map
            </Seg>
            <Seg active={lens} onClick={() => onLens(true)} title="Lens view (L)">
              Lens
            </Seg>
          </div>
          <MoreMenu items={menu} />
          {!scripted ? <AccountMenu className="ml-1 max-sm:hidden" /> : null}
        </div>
      </div>
      <div data-tour="lens-bar" className="min-w-0">
        <LensChips axes={axes} finding={finding} saving={savingAxes} lens={lens} xId={xId} yId={yId} onSave={onSaveAxes} />
      </div>
    </div>
  );
}

function Seg({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`h-8 rounded-[10px] px-3 text-xs font-medium transition-colors ${active ? "bg-ink text-paper-raised" : "text-ink-soft hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function MoreMenu({ items }: { items: MoreItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-xl text-lg leading-none text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
      >
        ⋯
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 z-50 mt-2 w-56 rounded-2xl border border-rule bg-paper-raised p-1.5 shadow-[var(--shadow-card)]"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                aria-checked={item.checked}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-paper-sunk disabled:opacity-40"
              >
                <span>
                  {item.checked !== undefined ? <span className="mr-2 inline-block w-3 text-ink-soft">{item.checked ? "✓" : ""}</span> : null}
                  {item.label}
                </span>
                {item.hint ? <kbd className="text-[10px] text-ink-faint">{item.hint}</kbd> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
