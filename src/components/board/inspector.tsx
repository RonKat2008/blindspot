"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { SessionState } from "@/lib/contract";
import type { AuthoredIdea } from "@/lib/supabase/account-types";
import { reducedTransition, spring } from "@/lib/motion";
import { fetchRelated, localRelated, type MediaIdea, type Related } from "./media";

type InspectorProps = {
  ideaId: string;
  state: SessionState;
  onClose: () => void;
  onJump: (id: string) => void;
  onHoverRelated: (id: string | null) => void;
  onRelated: (ids: string[]) => void;
  onShortlist: (id: string, next: boolean) => void;
  onAssumption: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Inspector({ ideaId, state, onClose, onJump, onHoverRelated, onRelated, onShortlist, onAssumption, onDelete }: InspectorProps) {
  const reduce = useReducedMotion();
  const idea = state.ideas.find((i) => i.id === ideaId) as (MediaIdea & AuthoredIdea) | undefined;
  const [related, setRelated] = useState<Related>(() => localRelated(ideaId, state));

  useEffect(() => {
    let live = true;
    const load = () =>
      fetchRelated(ideaId, state).then((r) => {
        if (!live) return r;
        setRelated(r);
        onRelated(r.nearest.map((n) => n.id));
        return r;
      });
    // "why" clauses are written in the background; one refetch picks up the cached ones.
    let timer = 0;
    void load().then((r) => {
      if (live && r.nearest.some((n) => !n.why)) timer = window.setTimeout(() => void load(), 2200);
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // state changes often (polling); re-fetch only when the selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!idea) return null;
  const when = new Date(idea.createdAt);
  const author = idea.authorName ?? idea.speaker ?? "You";

  return (
    <motion.aside
      aria-label="Idea details"
      className="fixed z-40 flex flex-col overflow-y-auto border-rule bg-paper-raised shadow-[var(--shadow-card)] max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[72svh] max-sm:rounded-t-3xl max-sm:border-t sm:inset-y-0 sm:right-0 sm:w-[24rem] sm:border-l"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
      transition={reduce ? reducedTransition : spring.gentle}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper-raised/95 px-5 py-3 backdrop-blur">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">This point</p>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-paper-sunk hover:text-ink" aria-label="Close details (Esc)">
          Close
        </button>
      </div>

      <div className="space-y-6 p-5">
        <section>
          {idea.mediaType === "image" && idea.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={idea.mediaUrl} alt={idea.mediaCaption ?? idea.text} className="mb-3 w-full rounded-lg border border-rule object-cover" />
          ) : null}
          {idea.mediaType === "audio" && idea.mediaUrl ? <audio controls src={idea.mediaUrl} className="mb-3 w-full" /> : null}
          <p className={`font-display leading-snug ${idea.text.length > 90 ? "text-lg" : "text-[1.4rem]"}`}>{idea.text}</p>
          {idea.mediaCaption && !idea.mediaCaption.startsWith(idea.text.replace(/…$/, "").slice(0, 40)) ? (
            <p className="mt-1 line-clamp-4 text-sm text-ink-soft italic">{idea.mediaCaption}</p>
          ) : null}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
            {idea.authorColor ? <span className="size-2 rounded-full" style={{ background: idea.authorColor }} /> : null}
            {author} · {Number.isNaN(when.getTime()) ? "" : when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {idea.kind === "assumption" ? " · assumption" : ""}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Where it leans</h3>
          <ul className="mt-2 space-y-2">
            {related.lensLeanings.map((l, i) => (
              <li key={l.axisId} className="text-xs">
                <div className="flex justify-between text-ink-soft">
                  <span>{l.poleA}</span>
                  <span>{l.poleB}</span>
                </div>
                <div className="relative mt-1 h-1.5 rounded-full bg-paper-sunk">
                  <span className="absolute top-0 left-1/2 h-full w-px bg-rule" />
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${((Math.max(-1, Math.min(1, l.score)) + 1) / 2) * 100}%`, background: `var(--axis-${i % 6})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <RelatedList title="Connected ideas" items={related.nearest} onJump={onJump} onHover={onHoverRelated} empty="Nothing connects to this yet. It's an island." />
        <RelatedList title="Furthest from this" items={related.farthest} onJump={onJump} onHover={onHoverRelated} empty="Add more ideas to see the far side." showBar={false} />

        {related.questions.length ? (
          <section>
            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Questions about it</h3>
            <ul className="mt-2 space-y-2">
              {related.questions.map((q) => (
                <li key={q.id} className="font-display text-sm text-signal-ink italic">
                  {q.text}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2 border-t border-rule pt-4">
          <Button type="button" variant="outline" className="h-9" onClick={() => onShortlist(idea.id, !idea.shortlisted)}>
            {idea.shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
          </Button>
          {idea.kind !== "assumption" ? (
            <Button type="button" variant="ghost" className="h-9" onClick={() => onAssumption(idea.id)}>
              Mark as assumption
            </Button>
          ) : null}
          <Button type="button" variant="ghost" className="h-9 text-destructive hover:text-destructive" onClick={() => onDelete(idea.id)}>
            Delete
          </Button>
        </section>
      </div>
    </motion.aside>
  );
}

function RelatedList({
  title,
  items,
  onJump,
  onHover,
  empty,
  showBar = true,
}: {
  title: string;
  items: Related["nearest"];
  onJump: (id: string) => void;
  onHover: (id: string | null) => void;
  empty: string;
  showBar?: boolean;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onJump(n.id)}
                onPointerEnter={() => onHover(n.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(n.id)}
                onBlur={() => onHover(null)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-paper-sunk focus-visible:bg-paper-sunk"
              >
                <span className="line-clamp-2">{n.text}</span>
                {n.why ? <span className="mt-0.5 block text-xs text-ink-soft italic">{n.why}</span> : null}
                {showBar ? (
                  <span className="mt-1 block h-1 w-full rounded-full bg-paper-sunk">
                    <span className="block h-full rounded-full bg-ink-soft" style={{ width: `${Math.round(Math.max(0.05, Math.min(1, n.similarity)) * 100)}%` }} />
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{empty}</p>
      )}
    </section>
  );
}
