"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { duration, ease, fadeUp, reducedTransition, revealRing, spring, staggerChildren } from "@/lib/motion";
import type { InsightsPayload } from "@/app/api/me/insights/compute";
import { LENSES, SESSIONS, TEAM, TOTAL_IDEAS } from "./data";

type Lens = { id: string; poleA: string; poleB: string; color: string };
type Board = {
  id: string;
  label: string;
  date: string;
  ideas: number;
  yours?: number;
  ends: Record<string, number>;
  range: number | null;
  provocations: { shown?: number; accepted: number; dismissed: number };
};

const EXAMPLE: InsightsPayload = {
  signedIn: true,
  example: true,
  teamName: TEAM,
  boards: SESSIONS.map((s) => ({
    ...s,
    yours: 0,
    others: s.ideas,
    provocations: { shown: s.provocations.accepted + s.provocations.dismissed, ...s.provocations },
  })),
  lenses: LENSES,
  headline: "never went radical.",
  detail: `Only ${SESSIONS.reduce((n, s) => n + s.ends["novelty:B"], 0)} of ${TOTAL_IDEAS} ideas leaned radical. Every session piled up in the same corner.`,
  humanIdeas: TOTAL_IDEAS,
  aiIdeas: 0,
  asked: SESSIONS.reduce((n, s) => n + s.provocations.accepted + s.provocations.dismissed, 0),
  taken: SESSIONS.reduce((n, s) => n + s.provocations.accepted, 0),
};

function useChartMotion() {
  const reduce = useReducedMotion();
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

function Heatmap({ boards, lenses }: { boards: Board[]; lenses: Lens[] }) {
  const { enter } = useChartMotion();
  const cols = Math.max(boards.length, 1);
  const cellW = Math.min(72, Math.max(36, Math.floor(220 / cols)));
  const gap = 4;
  const cellX = 126;
  const w = cellX + cols * (cellW + gap) + 8;
  const top = 44;
  const rowStep = 28;
  const groupStep = 70;
  const cellH = 24;
  const rowY = (g: number, e: number) => top + g * groupStep + e * rowStep;
  const height = lenses.length ? rowY(lenses.length - 1, 1) + cellH + 8 : 80;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Heatmap of ideas at each lens end across your boards.">
      {boards.map((s, c) => (
        <g key={s.id}>
          <text x={cellX + c * (cellW + gap) + cellW / 2} y={16} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)">
            {s.label}
          </text>
          <text x={cellX + c * (cellW + gap) + cellW / 2} y={30} textAnchor="middle" fontSize={9.5} fill="var(--ink-faint)">
            {s.date} · {s.ideas}
            {typeof s.yours === "number" && s.ideas > 0 ? ` · you ${Math.round((100 * s.yours) / s.ideas)}%` : ""}
          </text>
        </g>
      ))}
      {lenses.map((lens, g) =>
        [0, 1].map((e) => {
          const key = `${lens.id}:${e === 0 ? "A" : "B"}`;
          const pole = e === 0 ? lens.poleA : lens.poleB;
          const y = rowY(g, e);
          return (
            <g key={key}>
              <text x={110} y={y + cellH / 2 + 4} textAnchor="end" fontSize={12} fontWeight={500} fill={lens.color}>
                {pole}
              </text>
              {boards.map((s, c) => {
                const n = s.ends[key] ?? 0;
                const share = s.ideas ? n / s.ideas : 0;
                const empty = s.ideas > 0 && share < 0.12;
                const x = cellX + c * (cellW + gap);
                return (
                  <motion.g key={s.id} {...enter(c * 0.08 + (g * 2 + e) * 0.03)}>
                    <rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
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
                    <text x={x + cellW / 2} y={y + cellH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} className="tnum" fill={empty ? "var(--signal-ink)" : share > 0.5 ? "var(--paper-raised)" : "var(--ink)"}>
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

function Sparkline({ boards }: { boards: Board[] }) {
  const { reduce, enter } = useChartMotion();
  const pts = boards
    .map((s, i) => ({ x: 0, y: 0, v: s.range, label: s.label, i }))
    .filter((p): p is { x: number; y: number; v: number; label: string; i: number } => p.v != null);
  if (pts.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">Range shows up once ideas have lens scores.</p>;
  }
  const w = 320;
  const h = 150;
  const yOf = (v: number) => 122 - v * 1.55;
  const placed = pts.map((p, i) => ({
    ...p,
    x: pts.length === 1 ? w / 2 : 34 + (i * (w - 68)) / (pts.length - 1),
    y: yOf(p.v),
  }));
  const line = placed
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const q = placed[i - 1];
      const mx = (q.x + p.x) / 2;
      return `C${mx},${q.y} ${mx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");
  const area = `${line} L${placed[placed.length - 1].x},${h - 24} L${placed[0].x},${h - 24} Z`;
  const draw = reduce
    ? { initial: false as const }
    : {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true, amount: 0.4 },
        transition: { duration: duration.reveal, ease: ease.outExpo },
      };
  const last = placed[placed.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Range across ${placed.length} boards.`}>
      <line x1={0} x2={w} y1={h - 24} y2={h - 24} stroke="var(--rule)" />
      {placed.length > 1 && <motion.path d={area} fill="var(--signal-wash)" opacity={0.7} {...enter(0.2)} />}
      {placed.length > 1 && <motion.path d={line} fill="none" stroke="var(--signal-ink)" strokeWidth={2.5} strokeLinecap="round" {...draw} />}
      {placed.map((p, i) => (
        <motion.g key={p.label + i} {...enter(0.2 + i * 0.08)}>
          <circle cx={p.x} cy={p.y} r={i === placed.length - 1 ? 5.5 : 4} fill={i === placed.length - 1 ? "var(--signal)" : "var(--paper-raised)"} stroke="var(--signal-ink)" strokeWidth={2} />
          <text x={p.x} y={p.y - 14} textAnchor="middle" className="display font-display tnum" fontSize={i === placed.length - 1 ? 22 : 16} fontWeight={600} fill="var(--ink)">
            {p.v}
          </text>
          <text x={p.x} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--ink-soft)">
            {p.label}
          </text>
        </motion.g>
      ))}
      {!reduce && placed.length > 1 && (
        <motion.circle cx={last.x} cy={last.y} r={5.5} fill="none" stroke="var(--signal)" strokeWidth={1.5} style={{ transformBox: "fill-box", transformOrigin: "center" }} {...revealRing} />
      )}
    </svg>
  );
}

function TakeRate({ boards }: { boards: Board[] }) {
  const { reduce, enter } = useChartMotion();
  const maxShown = Math.max(1, ...boards.map((s) => s.provocations.accepted + s.provocations.dismissed));
  const w = 320;
  const x0 = 76;
  const barW = 170;
  const rowH = 40;
  return (
    <svg viewBox={`0 0 ${w} ${Math.max(boards.length, 1) * rowH}`} className="h-auto w-full" role="img" aria-label="Questions accepted versus dismissed per board.">
      {boards.map((s, i) => {
        const { accepted, dismissed } = s.provocations;
        const unit = barW / maxShown;
        const y = i * rowH + 8;
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
        const total = accepted + dismissed;
        return (
          <g key={s.id}>
            <text x={0} y={y + 14} fontSize={12} fontWeight={500} fill="var(--ink)">
              {s.label}
            </text>
            {accepted > 0 && <motion.rect x={x0} y={y} width={Math.max(0, accepted * unit - 2)} height={20} rx={4} fill="var(--accept)" style={style} {...grow(i * 0.08)} />}
            {dismissed > 0 && <motion.rect x={x0 + accepted * unit} y={y} width={dismissed * unit} height={20} rx={4} fill="var(--rule)" style={style} {...grow(i * 0.08 + 0.05)} />}
            <motion.text x={x0 + barW + 14} y={y + 15} fontSize={13} fontWeight={600} className="tnum" fill="var(--ink)" {...enter(0.2 + i * 0.08)}>
              {total ? `${Math.round((accepted / total) * 100)}%` : "—"}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}

function Report({ data, example }: { data: InsightsPayload; example: boolean }) {
  const reduce = useReducedMotion();
  const fade = reduce ? { transition: reducedTransition } : {};
  const ranged = data.boards.filter((b) => b.range != null);
  const delta = ranged.length >= 2 ? (ranged[ranged.length - 1].range ?? 0) - (ranged[0].range ?? 0) : null;
  const few = data.boards.length < 3;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-8">
      <p className="text-sm text-[var(--ink-soft)]">
        {example ? "Example team" : data.teamName} <span aria-hidden>·</span> {data.boards.length} {data.boards.length === 1 ? "board" : "boards"}
        {example && (
          <>
            {" "}
            <Link href="/login?next=/insights" className="font-semibold text-[var(--ink)] underline decoration-[var(--rule)] underline-offset-4">
              Sign in to see your own
            </Link>
          </>
        )}
      </p>

      <motion.section variants={staggerChildren} initial={reduce ? false : "hidden"} animate="show" className="pt-8">
        <motion.div variants={fadeUp} {...fade}>
          <Label>Your team&apos;s thinking, over time</Label>
        </motion.div>
        <motion.h1 variants={fadeUp} {...fade} className="display font-display mt-4 max-w-4xl text-balance font-semibold leading-[1.04] tracking-[-0.02em] [font-size:var(--text-hero)]">
          Across {data.boards.length} {data.boards.length === 1 ? "board" : "boards"}, your team{" "}
          <span className="italic text-[var(--signal-ink)]">{data.headline}</span>
        </motion.h1>
        <motion.p variants={fadeUp} {...fade} className="mt-6 max-w-xl text-[var(--text-base)] text-[var(--ink-soft)]">
          {data.detail}
        </motion.p>
        {few && (
          <p className="mt-4 max-w-xl rounded-2xl bg-[var(--paper-raised)] px-4 py-3 text-sm text-[var(--ink-soft)] shadow-[var(--shadow-card)]">
            After 3 boards, patterns appear here.
          </p>
        )}
      </motion.section>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <section aria-labelledby="coverage-h" className="rounded-[20px] bg-[var(--paper-raised)] p-4 shadow-[var(--shadow-card)] sm:p-7">
          <Label>Lens coverage</Label>
          <h2 id="coverage-h" className="display font-display mt-1 text-2xl font-semibold tracking-tight">
            Where the ideas landed
          </h2>
          <p className="mb-5 mt-1 text-sm text-[var(--ink-soft)]">
            Ideas beyond each end of a lens (|score| ≥ 0.3). Amber is ground almost nobody stood on.
          </p>
          {data.lenses.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">Lenses appear after a board has axes.</p>
          ) : (
            <Heatmap boards={data.boards} lenses={data.lenses} />
          )}
        </section>

        <div className="flex flex-col gap-12">
          <section aria-labelledby="range-h">
            <Label>Range score</Label>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <h2 id="range-h" className="display font-display text-2xl font-semibold tracking-tight">
                {delta == null ? "One reading" : delta >= 0 ? "Widening" : "Narrowing"}
              </h2>
              {delta != null && (
                <span className="tnum text-sm font-semibold text-[var(--accept)]">
                  {delta >= 0 ? "+" : ""}
                  {delta} across {ranged.length}
                </span>
              )}
            </div>
            <div className="mt-4 border-t border-[var(--rule)] pt-4">
              <Sparkline boards={data.boards} />
            </div>
          </section>

          <section aria-labelledby="take-h">
            <Label>Questions taken</Label>
            <h2 id="take-h" className="display font-display mt-1 text-2xl font-semibold tracking-tight">
              {data.asked === 0 ? "No questions yet" : `${data.taken} of ${data.asked} taken`}
            </h2>
            <p className="mt-1 flex items-center gap-4 text-xs text-[var(--ink-soft)]">
              <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm bg-[var(--accept)]" />Taken</span>
              <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm bg-[var(--rule)]" />Not now</span>
            </p>
            <div className="mt-4 border-t border-[var(--rule)] pt-4">
              <TakeRate boards={data.boards} />
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
        <p className="display font-display text-balance font-semibold leading-[1.05] tracking-[-0.02em] [font-size:var(--text-hero)]">
          The AI wrote <span className="tnum text-[var(--signal-ink)]">0</span> of <span className="tnum">{data.humanIdeas}</span> ideas.
        </p>
        <p className="mt-4 text-[var(--text-base)] text-[var(--ink-soft)]">
          It asked {data.asked} questions. Your team took {data.taken}. Everything on this page is your own thinking, shown back.
        </p>
      </motion.section>
    </div>
  );
}

export function InsightsView() {
  const [state, setState] = useState<"loading" | "example" | "empty" | "ready" | "error">("loading");
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/me/insights", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancel) setState("example");
          return;
        }
        const body = (await res.json()) as InsightsPayload & { error?: string; boards?: InsightsPayload["boards"] };
        if (!res.ok) throw new Error(body.error || "Could not load insights");
        if (cancel) return;
        if (!body.boards || body.boards.length === 0) {
          setState("empty");
          return;
        }
        setData(body);
        setState("ready");
      } catch (err) {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "Could not load insights");
          setState("error");
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-8" aria-busy="true" aria-label="Loading insights">
        <div className="h-4 w-40 animate-pulse rounded bg-[var(--rule)]" />
        <div className="mt-8 h-16 max-w-xl animate-pulse rounded-2xl bg-[var(--paper-raised)]" />
        <div className="mt-10 h-64 animate-pulse rounded-[20px] bg-[var(--paper-raised)]" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-8">
        <p className="text-[var(--ink)]">{error}</p>
        <button type="button" className="mt-4 underline" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-8">
        <p className="text-sm text-[var(--ink-soft)]">Your boards</p>
        <h1 className="display font-display mt-4 text-4xl font-semibold">No boards yet.</h1>
        <p className="mt-3 max-w-md text-[var(--ink-soft)]">
          After a few sessions, this page shows which lens ends you never reach.{" "}
          <Link href="/new" className="font-semibold text-[var(--ink)] underline">Start a board</Link>
        </p>
        <div className="mt-10 border-t border-[var(--rule)] pt-8">
          <Report data={EXAMPLE} example />
        </div>
      </div>
    );
  }

  if (state === "example") return <Report data={EXAMPLE} example />;
  return <Report data={data!} example={false} />;
}
