"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { duration, ease, fadeUp, reducedTransition, staggerChildren } from "@/lib/motion";

const kicker = "text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]";
const big = "display font-semibold leading-[1.02] tracking-[-0.025em] text-balance";

/** Staggered wrapper so each slide's parts arrive in reading order. */
function Stage({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={staggerChildren} initial={reduce ? false : "hidden"} animate="show" className="flex w-full max-w-5xl flex-col">
      {children}
    </motion.div>
  );
}

function Item({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={fadeUp} transition={reduce ? reducedTransition : undefined} className={className}>
      {children}
    </motion.div>
  );
}

function Problem() {
  return (
    <Stage>
      <Item className={kicker}>The problem</Item>
      <Item className={`${big} mt-6 [font-size:clamp(3rem,1rem+9vw,9rem)]`}>
        <h1>
          AI <span className="italic text-[var(--signal-ink)]">narrows</span> your ideas.
        </h1>
      </Item>
      <Item className="mt-8 max-w-2xl text-[clamp(1.125rem,0.9rem+1vw,1.625rem)] leading-snug text-[var(--ink-soft)]">
        Microsoft Research found that using generative AI leads knowledge workers to a narrower range of ideas.
      </Item>
    </Stage>
  );
}

function Product() {
  return (
    <Stage>
      <Item className={kicker}>Blind Spot</Item>
      <Item className={`${big} mt-6 [font-size:clamp(2.25rem,1rem+5.5vw,6rem)]`}>
        <h1>AI that widens your thinking without giving you a single idea.</h1>
      </Item>
      <Item className="mt-10 self-start rounded-[12px] border border-dashed border-[var(--signal)] bg-[var(--signal-wash)] px-5 py-4">
        <p className={kicker}>The one rule</p>
        <p className="display mt-1 text-[clamp(1.25rem,1rem+1.2vw,2rem)] font-semibold">
          It asks. It never suggests.
        </p>
      </Item>
    </Stage>
  );
}

const STEPS = [
  { n: "1", title: "Lenses", body: "Name the spectrums your problem lives on.", color: "var(--axis-0)" },
  { n: "2", title: "Map", body: "Every idea lands between the poles. Empty corners show.", color: "var(--axis-2)" },
  { n: "3", title: "Provocation", body: "One question about the gap. Never an answer.", color: "var(--signal-ink)" },
];

function How() {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce
      ? { initial: false as const }
      : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: duration.slow, ease: ease.outExpo, delay } };
  return (
    <Stage>
      <Item className={kicker}>How it works</Item>
      <Item className={`${big} mt-6 [font-size:clamp(2.25rem,1rem+4.5vw,5rem)]`}>
        <h1>Lenses, then a map, then a question.</h1>
      </Item>
      <Item className="mt-12 w-full">
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-0">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative sm:pr-6">
              <div className="flex items-center gap-3">
                <span className="display flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-semibold" style={{ borderColor: s.color, color: s.color }}>
                  {s.n}
                </span>
                {i < STEPS.length - 1 && (
                  <svg aria-hidden viewBox="0 0 100 12" preserveAspectRatio="none" className="hidden h-3 flex-1 sm:block">
                    <motion.path d="M0,6 L92,6 M85,1 L92,6 L85,11" fill="none" stroke="var(--ink-faint)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" {...draw(0.5 + i * 0.4)} />
                  </svg>
                )}
              </div>
              <h2 className="display mt-4 text-3xl font-semibold" style={{ color: s.color }}>
                {s.title}
              </h2>
              <p className="mt-2 max-w-[18rem] text-[var(--text-base)] text-[var(--ink-soft)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </Item>
    </Stage>
  );
}

function Company() {
  return (
    <Stage>
      <Item className={kicker}>Why it&apos;s a company</Item>
      <Item className={`${big} mt-6 [font-size:clamp(2.25rem,1rem+4.5vw,5rem)]`}>
        <h1>A wedge today. A moat by the third session.</h1>
      </Item>
      <Item className="mt-10 grid gap-8 border-t-2 border-[var(--ink)] pt-6 sm:grid-cols-2 sm:gap-12">
        <div>
          <p className={kicker}>Wedge</p>
          <p className="display mt-2 text-2xl font-semibold">Product and design teams</p>
          <p className="mt-1 text-[var(--ink-soft)]">Alongside FigJam and Miro, not instead of them.</p>
          <p className="display mt-4 text-2xl font-semibold">Education</p>
          <p className="mt-1 text-[var(--ink-soft)]">Teach students to see their own thinking.</p>
        </div>
        <div>
          <p className={kicker}>Moat</p>
          <p className="display mt-2 text-2xl font-semibold">Longitudinal data on how a team thinks.</p>
          <p className="mt-1 text-[var(--ink-soft)]">Every session sharpens the next. No one else holds this.</p>
          <Link
            href="/insights"
            onClick={(e) => e.stopPropagation()}
            className="mt-4 inline-flex items-center gap-2 rounded-[6px] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)] transition-transform hover:-translate-y-px active:scale-[0.97]"
          >
            See the team view <span aria-hidden>→</span>
          </Link>
        </div>
      </Item>
    </Stage>
  );
}

function Close() {
  return (
    <Stage>
      <Item className={`${big} [font-size:clamp(2.5rem,1rem+6.5vw,7rem)]`}>
        <h1>
          The AI never wrote an idea.{" "}
          <span className="italic text-[var(--signal-ink)]">It only showed you your own thinking.</span>
        </h1>
      </Item>
      <Item className="mt-10 flex items-baseline gap-4">
        <span className="display text-2xl font-semibold">Blind Spot</span>
        <span className="text-[var(--ink-soft)]">You wrote it. We asked.</span>
      </Item>
    </Stage>
  );
}

export const SLIDES: { id: string; title: string; render: () => ReactNode }[] = [
  { id: "problem", title: "Problem", render: () => <Problem /> },
  { id: "product", title: "Blind Spot", render: () => <Product /> },
  { id: "how", title: "How", render: () => <How /> },
  { id: "company", title: "Why a company", render: () => <Company /> },
  { id: "close", title: "Close", render: () => <Close /> },
];
