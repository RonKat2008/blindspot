"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { duration, ease, fadeUp, reducedTransition, revealRing, spring, staggerChildren } from "@/lib/motion";
import { LENSES, SESSIONS, TEAM, TOTAL_IDEAS } from "./data";

const RADICAL_IDEAS = SESSIONS.reduce((n, s) => n + s.ends["novelty:B"], 0);
const SOCIAL_IDEAS = SESSIONS.reduce((n, s) => n + s.ends["scope:B"], 0);
const ASKED = SESSIONS.reduce((n, s) => n + s.provocations.accepted + s.provocations.dismissed, 0);
const TAKEN = SESSIONS.reduce((n, s) => n + s.provocations.accepted, 0);

function useChartMotion() {
  const reduce = useReducedMotion();
  /** Fade/slide a chart element in; collapses to a static render when motion is reduced. */
  const enter = (delay = 0) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 6 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { ...spring.gentle, delay },
        };
  return { reduce: !!reduce, enter };
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
      {children}
    </p>
  );
}

/* ---------- Heatmap: sessions x lens ends ---------- */

const HM = { w: 360, labelX: 110, cellX: 126, cellW: 72, cellH: 24, gap: 4, top: 44, rowStep: 28, groupStep: 70 };

function Heatmap() {
  const { enter } = useChartMotion();
  const rowY = (g: number, e: number) => HM.top + g * HM.groupStep + e * HM.rowStep;
  const height = rowY(LENSES.length - 1, 1) + HM.cellH + 8;

  return (
    <svg
      viewBox={`0 0 ${HM.w} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Heatmap of how many ideas leaned toward each end of five lenses, across three sessions. The radical and social ends are nearly empty in every session."
    >
      {SESSIONS.map((s, c) => (
        <g key={s.id}>
          <text x={HM.cellX + c * (HM.cellW + HM.gap) + HM.cellW / 2} y={16} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)">
            {s.label}
          </text>
          <text x={HM.cellX + c * (HM.cellW + HM.gap) + HM.cellW / 2} y={30} textAnchor="middle" fontSize={9.5} fill="var(--ink-faint)">
            {s.date} · {s.ideas} ideas
          </text>
        </g>
      ))}

      {LENSES.map((lens, g) =>
        [0, 1].map((e) => {
          const key = `${lens.id}:${e === 0 ? "A" : "B"}`;
          const pole = e === 0 ? lens.poleA : lens.poleB;
          const y = rowY(g, e);
          const isGapEnd = e === 1 && (lens.id === "novelty" || lens.id === "scope");
          return (
            <g key={key}>
              {isGapEnd && (
                <rect x={0} y={y - 2} width={HM.w} height={HM.cellH + 4} rx={6} fill="var(--signal-wash)" opacity={0.55} />
              )}
              <text x={HM.labelX} y={y + HM.cellH / 2 + 4} textAnchor="end" fontSize={12} fontWeight={e === 0 ? 500 : 600} fill={lens.color}>
                {pole}
              </text>
              {SESSIONS.map((s, c) => {
                const n = s.ends[key];
                const share = n / s.ideas;
                const empty = share < 0.12;
                const x = HM.cellX + c * (HM.cellW + HM.gap);
                return (
                  <motion.g key={s.id} {...enter(c * 0.12 + (g * 2 + e) * 0.035)}>
                    <rect
                      x={x}
                      y={y}
                      width={HM.cellW}
                      height={HM.cellH}
                      rx={4}
                      style={{
                        fill: empty
                          ? "var(--signal-wash)"
                          : `color-mix(in oklch, ${lens.color} ${Math.min(100, Math.round(share * 115))}%, var(--paper-raised))`,
                        stroke: empty ? "var(--signal)" : "none",
                      }}
                      strokeDasharray={empty ? "3 2.5" : undefined}
                      strokeWidth={empty ? 1.2 : 0}
                    />
                    <text x={x + HM.cellW / 2} y={y + HM.cellH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} className="tnum" fill={empty ? "var(--signal-ink)" : share > 0.5 ? "var(--paper-raised)" : "var(--ink)"}>
                      {n}
                    </text>
                  </motion.g>
                );
              })}
            </g>
          );
        }),
      )}
    </svg>
  );
}

/* ---------- Range sparkline ---------- */

const SP = { w: 320, h: 150, xs: [34, 160, 286], y: (v: number) => 122 - v * 1.55 };

function Sparkline() {
  const { reduce, enter } = useChartMotion();
  const pts = SESSIONS.map((s, i) => ({ x: SP.xs[i], y: SP.y(s.range), v: s.range, label: s.label }));
  const line = pts
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const q = pts[i - 1];
      const mx = (q.x + p.x) / 2;
      return `C${mx},${q.y} ${mx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");
  const area = `${line} L${pts[2].x},${SP.h - 24} L${pts[0].x},${SP.h - 24} Z`;
  const draw = reduce
    ? { initial: false as const }
    : {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true, amount: 0.4 },
        transition: { duration: duration.reveal, ease: ease.outExpo },
      };

  return (
    <svg viewBox={`0 0 ${SP.w} ${SP.h}`} className="h-auto w-full" role="img" aria-label={`Range score rose from ${pts[0].v} to ${pts[1].v} to ${pts[2].v} across three sessions.`}>
      <line x1={0} x2={SP.w} y1={SP.h - 24} y2={SP.h - 24} stroke="var(--rule)" />
      <motion.path d={area} fill="var(--signal-wash)" opacity={0.7} {...enter(0.5)} />
      <motion.path d={line} fill="none" stroke="var(--signal-ink)" strokeWidth={2.5} strokeLinecap="round" {...draw} />
      {pts.map((p, i) => (
        <motion.g key={p.label} {...enter(0.35 + i * 0.35)}>
          <circle cx={p.x} cy={p.y} r={i === 2 ? 5.5 : 4} fill={i === 2 ? "var(--signal)" : "var(--paper-raised)"} stroke="var(--signal-ink)" strokeWidth={2} />
          <text x={p.x} y={p.y - 14} textAnchor="middle" className="display tnum" fontSize={i === 2 ? 24 : 18} fontWeight={600} fill="var(--ink)">
            {p.v}
          </text>
          <text x={p.x} y={SP.h - 8} textAnchor="middle" fontSize={10.5} fill="var(--ink-soft)">
            {p.label}
          </text>
        </motion.g>
      ))}
      {!reduce && (
        <motion.circle
          cx={pts[2].x}
          cy={pts[2].y}
          r={5.5}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={1.5}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          {...revealRing}
          transition={{ ...revealRing.transition, delay: 1.1 }}
        />
      )}
    </svg>
  );
}

/* ---------- Provocation take-rate bars ---------- */

const BR = { w: 320, x0: 76, barW: 170, rowH: 40 };

function TakeRate() {
  const { reduce, enter } = useChartMotion();
  const maxShown = Math.max(...SESSIONS.map((s) => s.provocations.accepted + s.provocations.dismissed));
  return (
    <svg viewBox={`0 0 ${BR.w} ${SESSIONS.length * BR.rowH}`} className="h-auto w-full" role="img" aria-label="Provocations accepted versus dismissed per session: 1 of 4, 2 of 5, then 4 of 5.">
      {SESSIONS.map((s, i) => {
        const { accepted, dismissed } = s.provocations;
        const unit = BR.barW / maxShown;
        const y = i * BR.rowH + 8;
        const grow = (delay: number) =>
          reduce
            ? { initial: false as const }
            : {
                initial: { scaleX: 0 },
                whileInView: { scaleX: 1 },
                viewport: { once: true, amount: 0.5 },
                transition: { ...spring.gentle, delay },
              };
        const style = { transformBox: "fill-box" as const, transformOrigin: "left center" };
        return (
          <g key={s.id}>
            <text x={0} y={y + 14} fontSize={12} fontWeight={500} fill="var(--ink)">
              {s.label}
            </text>
            <motion.rect x={BR.x0} y={y} width={accepted * unit - 2} height={20} rx={4} fill="var(--accept)" style={style} {...grow(i * 0.12)} />
            <motion.rect x={BR.x0 + accepted * unit} y={y} width={dismissed * unit} height={20} rx={4} fill="var(--rule)" style={style} {...grow(i * 0.12 + 0.1)} />
            <motion.text x={BR.x0 + BR.barW + 14} y={y + 15} fontSize={13} fontWeight={600} className="tnum" fill="var(--ink)" {...enter(0.3 + i * 0.12)}>
              {Math.round((accepted / (accepted + dismissed)) * 100)}%
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Page ---------- */

export function InsightsView() {
  const reduce = useReducedMotion();
  const fade = reduce ? { transition: reducedTransition } : {};

  return (
    <div className="bs-scope min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-8">
        <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] pb-4">
          <span className="display text-xl font-semibold tracking-tight">Blind Spot</span>
          <span className="text-sm text-[var(--ink-soft)]">
            {TEAM} <span aria-hidden>·</span> {SESSIONS.length} sessions
          </span>
        </header>

        <motion.section variants={staggerChildren} initial={reduce ? false : "hidden"} animate="show" className="pt-[var(--space-section,4rem)]">
          <motion.div variants={fadeUp} {...fade}>
            <Label>Your team&apos;s thinking, over time</Label>
          </motion.div>
          <motion.h1 variants={fadeUp} {...fade} className="display mt-4 max-w-4xl text-balance font-semibold leading-[1.04] tracking-[-0.02em] [font-size:var(--text-hero)]">
            Across {SESSIONS.length} sessions, your team{" "}
            <span className="relative whitespace-nowrap italic text-[var(--signal-ink)]">
              never went radical.
              <svg aria-hidden viewBox="0 0 300 10" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-2 w-full">
                <motion.path
                  d="M2,6 C60,1 120,9 180,4 S270,6 298,3"
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: duration.reveal, ease: ease.outExpo, delay: 0.5 }}
                />
              </svg>
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} {...fade} className="mt-6 max-w-xl text-[var(--text-base)] text-[var(--ink-soft)]">
            Only {RADICAL_IDEAS} of {TOTAL_IDEAS} ideas leaned radical, and {SOCIAL_IDEAS} leaned social. Every session
            piled up in the same corner: incremental, individual, digital, quick and cheap.
          </motion.p>
        </motion.section>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <section aria-labelledby="coverage-h" className="rounded-[20px] bg-[var(--paper-raised)] p-4 shadow-[var(--shadow-card)] sm:p-7">
            <Label>Lens coverage</Label>
            <h2 id="coverage-h" className="display mt-1 text-2xl font-semibold tracking-tight">
              Where the ideas landed
            </h2>
            <p className="mb-5 mt-1 text-sm text-[var(--ink-soft)]">
              Ideas leaning toward each end of a lens. Amber is ground nobody stood on.
            </p>
            <Heatmap />
          </section>

          <div className="flex flex-col gap-12">
            <section aria-labelledby="range-h">
              <Label>Range score</Label>
              <div className="mt-1 flex items-baseline justify-between gap-4">
                <h2 id="range-h" className="display text-2xl font-semibold tracking-tight">
                  Widening, slowly
                </h2>
                <span className="tnum text-sm font-semibold text-[var(--accept)]">
                  +{SESSIONS[2].range - SESSIONS[0].range} in {SESSIONS.length} sessions
                </span>
              </div>
              <div className="mt-4 border-t border-[var(--rule)] pt-4">
                <Sparkline />
              </div>
            </section>

            <section aria-labelledby="take-h">
              <Label>Questions taken</Label>
              <h2 id="take-h" className="display mt-1 text-2xl font-semibold tracking-tight">
                They started listening
              </h2>
              <p className="mt-1 flex items-center gap-4 text-xs text-[var(--ink-soft)]">
                <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm bg-[var(--accept)]" />Taken</span>
                <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm bg-[var(--rule)]" />Not now</span>
              </p>
              <div className="mt-4 border-t border-[var(--rule)] pt-4">
                <TakeRate />
              </div>
            </section>
          </div>
        </div>

        <motion.section
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={reduce ? reducedTransition : spring.gentle}
          className="mt-20 border-t-2 border-[var(--ink)] pt-8"
        >
          <p className="display text-balance font-semibold leading-[1.05] tracking-[-0.02em] [font-size:var(--text-hero)]">
            The AI wrote <span className="tnum text-[var(--signal-ink)]">0</span> of{" "}
            <span className="tnum">{TOTAL_IDEAS}</span> ideas.
          </p>
          <p className="mt-4 text-[var(--text-base)] text-[var(--ink-soft)]">
            It asked {ASKED} questions. Your team took {TAKEN}. Everything on this page is your own thinking, shown back.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
