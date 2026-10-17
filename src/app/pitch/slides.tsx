"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { fadeUp, reducedTransition, spring, staggerChildren } from "@/lib/motion";

const DEMO_URL = "https://blindspot-sable.vercel.app/demo";
const MSR =
  "https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/";

const kicker = "text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)] sm:text-[0.8125rem]";
const big = "display font-display font-semibold leading-[1.05] tracking-[-0.025em] text-balance";

export type Slide = {
  id: string;
  title: string;
  notes: string;
  render: () => ReactNode;
};

function Stage({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="flex w-full max-w-5xl flex-col"
    >
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

function Title() {
  return (
    <Stage>
      <Item className={kicker}>A thinking aid</Item>
      <Item className={`${big} mt-4 [font-size:clamp(3.25rem,2rem+8vw,8.5rem)]`}>
        <h1>Blind Spot</h1>
      </Item>
      <Item className="mt-6 max-w-2xl text-[clamp(1.15rem,0.95rem+1vw,1.75rem)] leading-snug text-[var(--ink-soft)]">
        AI that widens your thinking without giving you a single idea.
      </Item>
    </Stage>
  );
}

function Why() {
  return (
    <Stage>
      <Item className={kicker}>Why we built this</Item>
      <Item className={`${big} mt-4 [font-size:clamp(2rem,1rem+4vw,4.25rem)]`}>
        <h1>An idea rooted in a room we were in.</h1>
      </Item>
      {/* FOUNDER_STORY */}
      <Item className="mt-8 max-w-xl rotate-[-1.5deg] rounded-sm bg-[#f6e7a8] px-5 py-4 shadow-[2px_3px_0_color-mix(in_oklch,var(--ink)_18%,transparent)]">
        <p className="font-display text-[clamp(1.15rem,1rem+0.6vw,1.5rem)] leading-snug text-[var(--ink)]">
          When everyone asks the same model, everyone gets the same answer.
        </p>
      </Item>
    </Stage>
  );
}

function Problem() {
  return (
    <Stage>
      <Item className={kicker}>The problem</Item>
      <Item className={`${big} mt-4 [font-size:clamp(2.25rem,1rem+5vw,5.5rem)]`}>
        <h1>
          Generative AI <span className="italic text-[var(--signal-ink)]">narrows</span> the range.
        </h1>
      </Item>
      <Item className="mt-6 max-w-2xl text-[clamp(1.05rem,0.9rem+0.6vw,1.35rem)] leading-snug text-[var(--ink-soft)]">
        Microsoft Research: when knowledge workers use generative AI, the ideas that come back cluster. Everyone&apos;s assistant hands everyone a similar answer.
      </Item>
      <Item>
        <a
          href={MSR}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-4 inline-block text-xs text-[var(--ink-faint)] underline decoration-[var(--rule)] underline-offset-4"
        >
          Lee et al., Microsoft Research — The Impact of Generative AI on Critical Thinking
        </a>
      </Item>
    </Stage>
  );
}

const NOTES = [
  { text: "Onboard with a checklist", color: "#f6e7a8", x: "8%", y: "18%", rot: -8 },
  { text: "A welcome video", color: "#f3d0c4", x: "38%", y: "8%", rot: 4 },
  { text: "Buddy for week one", color: "#d7ead4", x: "62%", y: "22%", rot: -3 },
];

function LensSketch() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-[220px] w-full max-w-xl sm:h-[260px]" aria-hidden>
      <div className="absolute inset-x-[8%] bottom-0 top-[18%] rounded-sm border border-[var(--rule)] bg-[var(--paper-raised)]">
        <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--rule)]" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--rule)]" />
        <span className="absolute left-2 top-1 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">incremental</span>
        <span className="absolute right-2 top-1 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">radical</span>
        <div className="hatch absolute bottom-0 right-0 h-1/2 w-1/2" />
      </div>
      {NOTES.map((n, i) => (
        <motion.div
          key={n.text}
          className="absolute w-[7.5rem] rounded-sm px-2 py-2 text-[11px] leading-tight shadow-sm sm:w-36 sm:text-xs"
          style={{ background: n.color, color: "var(--ink)" }}
          initial={reduce ? { left: "58%", top: "58%", rotate: 0 } : { left: n.x, top: n.y, rotate: n.rot }}
          animate={{ left: `${18 + i * 14}%`, top: "46%", rotate: i - 1 }}
          transition={reduce ? reducedTransition : { ...spring.flight, delay: 0.35 + i * 0.18 }}
        >
          {n.text}
        </motion.div>
      ))}
      <motion.div
        className="absolute bottom-[8%] right-[6%] w-40 rounded-sm border border-[#1d4e89] bg-[#e7f0fb] px-3 py-2 text-xs leading-snug text-[#1d4e89] shadow-sm sm:w-48 sm:text-sm"
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? reducedTransition : { ...spring.gentle, delay: 1.15 }}
      >
        <span className="font-display text-base font-semibold">?</span> None of these are radical. What would a first week look like if it were?
      </motion.div>
    </div>
  );
}

function Does() {
  return (
    <Stage>
      <Item className={kicker}>What it does</Item>
      <Item className={`${big} mt-3 [font-size:clamp(1.75rem,1rem+3vw,3.25rem)]`}>
        <h1>Whiteboard, then lenses. A question — never an idea.</h1>
      </Item>
      <Item className="mt-4 text-sm text-[var(--ink-soft)] sm:text-base">
        Stickies flip onto the lens map. The empty corner is the blind spot. The note that appears only asks.
      </Item>
      <Item className="mt-4">
        <LensSketch />
      </Item>
    </Stage>
  );
}

function Live() {
  return (
    <Stage>
      <Item className={`${big} [font-size:clamp(2.75rem,1.4rem+6vw,6.5rem)]`}>
        <h1>Live demo</h1>
      </Item>
      <Item className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="rounded-sm bg-[var(--paper-raised)] p-3 shadow-[2px_3px_0_color-mix(in_oklch,var(--ink)_12%,transparent)]">
          <QRCodeSVG value={DEMO_URL} size={148} bgColor="transparent" fgColor="currentColor" aria-label="QR code to the Blind Spot demo" />
        </div>
        <div>
          <p className={kicker}>Open on a phone</p>
          <a
            href={DEMO_URL}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 block break-all font-display text-[clamp(1.15rem,1rem+0.8vw,1.75rem)] font-semibold underline decoration-[var(--rule)] underline-offset-4"
          >
            blindspot-sable.vercel.app
          </a>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">QR opens /demo</p>
        </div>
      </Item>
    </Stage>
  );
}

const PIPE = ["model", "blocklist", "judge", "template"];

function Rule() {
  return (
    <Stage>
      <Item className={kicker}>The one rule, enforced</Item>
      <Item className={`${big} mt-3 [font-size:clamp(1.85rem,1rem+3.2vw,3.5rem)]`}>
        <h1>It asks. It never suggests.</h1>
      </Item>
      <Item className="mt-6">
        <ol className="flex flex-wrap items-center gap-2">
          {PIPE.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-sm border border-[var(--ink)] bg-[var(--paper-raised)] px-3 py-1.5 font-display text-base font-semibold capitalize sm:text-lg">
                {step}
              </span>
              {i < PIPE.length - 1 && <span aria-hidden className="text-[var(--ink-faint)]">→</span>}
            </li>
          ))}
        </ol>
      </Item>
      <Item className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-8">
        <p className="font-display text-[clamp(1.5rem,1rem+1.5vw,2.25rem)] font-semibold">40/40 safe in eval</p>
        <p className="max-w-xs rotate-[-1deg] rounded-sm bg-[#e7f0fb] px-4 py-3 font-display text-lg text-[#1d4e89]">
          You wrote 10 ideas · AI wrote 0
        </p>
      </Item>
    </Stage>
  );
}

const DECISIONS = [
  { title: "The one rule", body: "Questions only. A suggestion is a failed question." },
  { title: "The scoring flaw", body: "We caught the bug that hid every real gap on the map." },
  { title: "Questions, then the board", body: "Whiteboard first. Answers were the temptation we refused." },
];

function Brought() {
  return (
    <Stage>
      <Item className={kicker}>What we brought that AI couldn&apos;t</Item>
      <Item className={`${big} mt-3 [font-size:clamp(1.75rem,1rem+2.8vw,3.15rem)]`}>
        <h1>Three decisions a model would not have made.</h1>
      </Item>
      <Item className="mt-6 grid gap-3 sm:grid-cols-3">
        {DECISIONS.map((d, i) => (
          <div
            key={d.title}
            className="rounded-sm px-4 py-3 shadow-[2px_3px_0_color-mix(in_oklch,var(--ink)_14%,transparent)]"
            style={{ background: ["#f6e7a8", "#f3d0c4", "#d7ead4"][i], rotate: `${(i - 1) * 1.2}deg` }}
          >
            <h2 className="font-display text-lg font-semibold">{d.title}</h2>
            <p className="mt-1 text-sm leading-snug text-[var(--ink-soft)]">{d.body}</p>
          </div>
        ))}
      </Item>
      <Item className="mt-6 text-[clamp(1rem,0.9rem+0.4vw,1.2rem)]">
        <p>Built by humans deciding, AI coding — Claude Code orchestrating Codex and Cursor.</p>
        <Link
          href="/why"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex text-sm font-medium underline decoration-[var(--rule)] underline-offset-4"
        >
          Read why →
        </Link>
      </Item>
    </Stage>
  );
}

function Close() {
  return (
    <Stage>
      <Item className={kicker}>Why it&apos;s a company</Item>
      <Item className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className={kicker}>Wedge</p>
          <p className="mt-1 font-display text-lg font-semibold leading-snug">Product and design teams, beside FigJam and Miro. Then classrooms.</p>
        </div>
        <div>
          <p className={kicker}>Moat</p>
          <p className="mt-1 font-display text-lg font-semibold leading-snug">Longitudinal data on how a team thinks.</p>
          <Link href="/insights" onClick={(e) => e.stopPropagation()} className="mt-1 inline-block text-sm underline decoration-[var(--rule)] underline-offset-4">
            Team view →
          </Link>
        </div>
        <div>
          <p className={kicker}>Fountain</p>
          <p className="mt-1 font-display text-lg font-semibold leading-snug">Phones today, purpose-built room hardware tomorrow.</p>
        </div>
      </Item>
      <Item className={`${big} mt-8 [font-size:clamp(1.65rem,1rem+2.4vw,2.75rem)]`}>
        <h1>
          The AI never wrote an idea.{" "}
          <span className="italic text-[var(--signal-ink)]">It only showed you your own thinking.</span>
        </h1>
      </Item>
    </Stage>
  );
}

export const SLIDES: Slide[] = [
  {
    id: "title",
    title: "Title",
    notes: "Name it, then the line: AI that widens your thinking without giving you a single idea. Three minutes. Top 8 at 5:15.",
    render: () => <Title />,
  },
  {
    id: "why",
    title: "Why we built this",
    notes: "Tell the founder story in your own words — the moment you noticed AI narrowing the team's ideas. Leave the placeholder until you replace it.",
    render: () => <Why />,
  },
  {
    id: "problem",
    title: "The problem",
    notes: "Microsoft Research: generative AI narrows knowledge workers' range of ideas. Everyone's assistant converges. That is the hook.",
    render: () => <Problem />,
  },
  {
    id: "does",
    title: "What it does",
    notes: "Whiteboard, then lenses. Lens view shows the empty corner. The blue note is a question, never an idea. Point at the hatch.",
    render: () => <Does />,
  },
  {
    id: "demo",
    title: "Live demo",
    notes: "Switch to the live product now. QR and URL are blindspot-sable.vercel.app/demo if a phone in the room wants in.",
    render: () => <Live />,
  },
  {
    id: "rule",
    title: "The one rule",
    notes: "Model, then blocklist, then judge, then template. 40 of 40 eval questions stayed safe. Ledger: you wrote 10 ideas, AI wrote 0.",
    render: () => <Rule />,
  },
  {
    id: "brought",
    title: "What we brought",
    notes: "Three human calls: the one rule; catching the scoring flaw that hid every real gap; questions over answers, whiteboard first. Humans decided. Claude Code orchestrated Codex and Cursor. Offer /why.",
    render: () => <Brought />,
  },
  {
    id: "close",
    title: "Close",
    notes: "Wedge: product and design next to FigJam and Miro, then classrooms. Moat: how a team thinks over time — open /insights if you have ten seconds. Fountain: phones now, room hardware later. Land the last line and stop.",
    render: () => <Close />,
  },
];
