"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { DECISIONS } from "./decisions";
import type { Decision } from "./decisions";

const EASE: Transition["ease"] = [0.16, 1, 0.3, 1];
const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

const AGENTS = ["Claude Code (orchestrator)", "Codex", "Cursor"] as const;

function useReveal(delay = 0) {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: REVEAL_VIEWPORT,
    transition: { duration: reduce ? 0.2 : 0.7, ease: EASE, delay },
  };
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-ui text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
      {children}
    </p>
  );
}

function Hero() {
  const reveal = useReveal();
  return (
    <motion.header {...reveal} className="max-w-3xl">
      <Eyebrow>Blind Spot · built Oct 17, 2026</Eyebrow>
      <h1 className="mt-4 font-display text-[length:var(--text-hero)] leading-[1.02] tracking-tight text-ink">
        How we built it, <em className="text-signal-ink">and what we decided.</em>
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
        AI wrote most of our code today. It did not decide what Blind Spot is
        for, who it helps, or what it must never do. These are the calls we made,
        in the order we made them.
      </p>
    </motion.header>
  );
}

function FounderStory() {
  const reveal = useReveal(0.1);
  return (
    <motion.section
      {...reveal}
      aria-labelledby="founder-heading"
      className="mt-[var(--space-section)] max-w-2xl border-l-2 border-signal pl-5 sm:pl-8"
    >
      <h2 id="founder-heading" className="sr-only">
        Why we built it
      </h2>
      <Eyebrow>Why we built it</Eyebrow>
      {/* FOUNDER_STORY */}
      <p className="mt-3 font-display text-[length:var(--text-question)] leading-snug text-ink">
        When everyone asks the same model, everyone gets the same answer.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Microsoft Research found that generative AI narrows the range of ideas
        knowledge workers produce.{" "}
        <a
          href="https://www.microsoft.com/en-us/research/articles/rethinking-ai-in-knowledge-work-from-assistant-to-tool-for-thought/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule underline-offset-4 transition-colors hover:text-ink hover:decoration-signal focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink"
        >
          Read the research
        </a>
      </p>
    </motion.section>
  );
}

function DecisionEntry({ decision, index }: { decision: Decision; index: number }) {
  const reveal = useReveal(0.05);
  const number = String(index + 1).padStart(2, "0");
  return (
    <motion.li {...reveal} className="relative pb-14 pl-12 last:pb-0 sm:pl-20">
      <span
        aria-hidden
        className="absolute left-0 top-0 grid size-9 place-items-center rounded-full border border-rule bg-paper-raised font-display text-sm text-ink shadow-card sm:left-3"
      >
        {number}
      </span>
      <p className="font-ui text-xs font-medium uppercase tracking-[0.16em] text-signal-ink">
        {decision.label}
      </p>
      <h3 className="mt-2 font-display text-2xl leading-tight text-ink sm:text-3xl">
        {decision.title}
      </h3>
      <div className="mt-5 grid gap-px overflow-hidden rounded-[20px] border border-rule bg-rule sm:grid-cols-2">
        <div className="bg-paper-sunk p-5">
          <p className="font-ui text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">
            AI proposed / built
          </p>
          <p className="mt-2 font-display text-base italic leading-relaxed text-ink-soft">
            {decision.aiSide}
          </p>
        </div>
        <div className="bg-paper-raised p-5">
          <p className="font-ui text-[11px] font-medium uppercase tracking-[0.16em] text-ink">
            We decided
          </p>
          <p className="mt-2 text-base leading-relaxed text-ink">{decision.weDecided}</p>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
        <span className="font-medium text-ink">Why: </span>
        {decision.why}
      </p>
    </motion.li>
  );
}

function Timeline() {
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="timeline-heading" className="mt-[var(--space-section)]">
      <Eyebrow>The judgment log</Eyebrow>
      <h2
        id="timeline-heading"
        className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl"
      >
        Seven calls the AI couldn&apos;t make for us.
      </h2>
      <div className="relative mt-12">
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-[17px] top-0 w-px origin-top bg-rule sm:left-[29px]"
          initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        <ol className="relative">
          {DECISIONS.map((decision, index) => (
            <DecisionEntry key={decision.id} decision={decision} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function HowAiHelped() {
  const reveal = useReveal();
  return (
    <motion.section
      {...reveal}
      aria-labelledby="ai-helped-heading"
      className="mt-[var(--space-section)] rounded-[20px] border border-rule bg-paper-raised p-6 shadow-card sm:p-10"
    >
      <Eyebrow>Being honest</Eyebrow>
      <h2 id="ai-helped-heading" className="mt-3 font-display text-3xl leading-tight text-ink">
        How AI helped
      </h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-[1.2fr_1fr]">
        <p className="text-base leading-relaxed text-ink-soft">
          We orchestrated coding agents that wrote most of the code in parallel,
          each on its own branch, merged as it went green. That is how a small
          team shipped boards, accounts, phone join, replay and a guarded
          question engine in one afternoon.
        </p>
        <div>
          <ul className="flex flex-wrap gap-2" aria-label="Coding agents">
            {AGENTS.map((agent) => (
              <li
                key={agent}
                className="rounded-md border border-rule bg-paper-sunk px-3 py-1 text-sm text-ink"
              >
                {agent}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-display text-lg italic leading-snug text-signal-ink">
            Humans decided what to build, who it&apos;s for, and what it must
            never do.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function Footer() {
  const linkClass =
    "inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium transition-[transform,background-color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink";
  return (
    <footer className="mt-[var(--space-section)] flex flex-wrap items-center gap-3 border-t border-rule pt-8">
      <Link href="/demo" className={`${linkClass} bg-ink text-paper-raised hover:bg-ink/90`}>
        Try the demo
      </Link>
      <Link
        href="/"
        className={`${linkClass} border border-rule text-ink hover:bg-paper-sunk`}
      >
        Back to Blind Spot
      </Link>
    </footer>
  );
}

export function WhyView() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
      <Hero />
      <FounderStory />
      <Timeline />
      <HowAiHelped />
      <Footer />
    </main>
  );
}
