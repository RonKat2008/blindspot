"use client";

// Chapters 1–8: problem → range.
import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ease } from "@/lib/motion";
import { Caption, Frame, Note, QuestionNote, STICKY, useLoopStep, useTourMotion } from "./primitives";

const AXIS = ["var(--axis-0)", "var(--axis-1)", "var(--axis-2)", "var(--axis-3)"] as const;

const SCATTER = [
  { x: 30, y: 40, r: -4, c: STICKY.butter, l: ["Free rides", "to polls"] },
  { x: 350, y: 30, r: 3, c: STICKY.blush, l: ["Vote at", "school"] },
  { x: 190, y: 120, r: -2, c: STICKY.mint, l: ["Text", "reminders"] },
  { x: 40, y: 220, r: 2, c: STICKY.sky, l: ["Election", "holiday"] },
  { x: 340, y: 210, r: -3, c: STICKY.butter, l: ["Ballot", "explainer"] },
  { x: 200, y: 245, r: 4, c: STICKY.blush, l: ["Block", "parties"] },
] as const;

export function ProblemArt() {
  const step = useLoopStep(3, 2200);
  const t = useTourMotion();
  const narrowed = step === 2;
  return (
    <Frame label="Six varied ideas collapse into one similar pile once everyone asks the same assistant">
      {SCATTER.map((n, i) => (
        <Note
          key={i}
          x={narrowed ? 188 + i * 4 : n.x}
          y={narrowed ? 130 + i * 3 : n.y}
          rotate={narrowed ? i - 2 : n.r}
          color={narrowed ? STICKY.sky : n.c}
          lines={narrowed ? ["Use an", "app for it"] : n.l}
          delay={i * 0.04}
        />
      ))}
      <motion.g initial={false} animate={{ opacity: step >= 1 ? 1 : 0, scale: step >= 1 ? 1 : 0.6 }} transition={t.snappy} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <rect x={198} y={22} width={84} height={26} rx={13} fill="var(--ink)" />
        <text x={240} y={39} textAnchor="middle" fontSize={11} fill="var(--paper-raised)" fontFamily="var(--font-ui)">
          Same assistant
        </text>
      </motion.g>
      <Caption x={240} y={326} anchor="middle" tone={narrowed ? "signal" : "soft"}>
        {narrowed ? "Six people, one idea." : "Six people, six directions."}
      </Caption>
    </Frame>
  );
}

const TYPED = ["Free rides to polls", "Vote at school", "Text reminders", "Election holiday", "Block parties"] as const;

export function WhiteboardArt() {
  const step = useLoopStep(6, 1100);
  const shown = step;
  return (
    <Frame label="Ideas typed into the input land as sticky notes on the board">
      {SCATTER.slice(0, 5).map((n, i) => (
        <Note key={i} x={n.x} y={i < shown ? n.y * 0.8 : 300} rotate={n.r} color={n.c} lines={n.l} opacity={i < shown ? 1 : 0} scale={i < shown ? 1 : 0.6} />
      ))}
      <rect x={24} y={282} width={432} height={40} rx={12} fill="var(--paper-raised)" stroke="var(--rule)" />
      <text x={40} y={307} fontSize={13} fill={step < 5 ? "var(--ink)" : "var(--ink-faint)"} fontFamily="var(--font-ui)">
        {step < 5 ? TYPED[step] : "Add an idea — anything goes"}
      </text>
      <text x={440} y={307} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-ui)">
        Enter ↵
      </text>
    </Frame>
  );
}

const LENSES = [
  ["Cheap", "Costly"],
  ["Online", "In person"],
  ["Individual", "Community"],
  ["Right now", "Long-term"],
] as const;

export function LensesArt() {
  const step = useLoopStep(LENSES.length + 2, 1000);
  const t = useTourMotion();
  return (
    <Frame label="Four lenses proposed for the prompt: cheap to costly, online to in person, individual to community, right now to long-term">
      <text x={32} y={52} fontSize={18} fontFamily="var(--font-display)" fill="var(--ink)">
        How might we get more people to vote?
      </text>
      {LENSES.map(([a, b], i) => {
        const y = 92 + i * 56;
        return (
          <motion.g key={a} initial={false} animate={{ opacity: step > i ? 1 : 0, x: step > i ? 0 : -16 }} transition={t.gentle}>
            <rect x={32} y={y} width={416} height={42} rx={10} fill="var(--paper-raised)" stroke="var(--rule)" />
            <circle cx={52} cy={y + 21} r={6} fill={AXIS[i]} />
            <text x={68} y={y + 26} fontSize={13} fill={AXIS[i]} fontFamily="var(--font-ui)" fontWeight={600}>
              {a}
            </text>
            <line x1={160} x2={320} y1={y + 21} y2={y + 21} stroke={AXIS[i]} strokeWidth={1.4} strokeDasharray="2 4" />
            <text x={428} y={y + 26} textAnchor="end" fontSize={13} fill={AXIS[i]} fontFamily="var(--font-ui)" fontWeight={600}>
              {b}
            </text>
          </motion.g>
        );
      })}
      <Caption x={32} y={326}>
        Lenses, not answers. Rename or remove any of them.
      </Caption>
    </Frame>
  );
}

// Board positions vs. lens positions (x = online→in person, y = individual→community).
const LENS_NOTES = [
  { bx: 30, by: 40, lx: 70, ly: 190 },
  { bx: 350, by: 30, lx: 140, ly: 230 },
  { bx: 190, by: 120, lx: 90, ly: 70 },
  { bx: 40, by: 220, lx: 280, ly: 220 },
  { bx: 340, by: 210, lx: 160, ly: 120 },
  { bx: 200, by: 245, lx: 330, ly: 250 },
] as const;

export function LensViewArt() {
  const step = useLoopStep(2, 2800);
  const t = useTourMotion();
  const lens = step === 1;
  return (
    <Frame label="Lens view arranges the notes on two lenses; the in-person, community corner is empty and shaded amber">
      <motion.g initial={false} animate={{ opacity: lens ? 1 : 0 }} transition={t.gentle}>
        <rect x={250} y={30} width={200} height={140} fill="var(--signal-wash)" stroke="var(--signal)" strokeDasharray="5 4" rx={4} />
        <text x={350} y={104} textAnchor="middle" fontSize={14} fontStyle="italic" fontFamily="var(--font-display)" fill="var(--signal-ink)">
          nothing here yet
        </text>
        <line x1={250} x2={250} y1={30} y2={310} stroke="var(--axis-1)" strokeWidth={1.2} />
        <line x1={30} x2={450} y1={170} y2={170} stroke="var(--axis-2)" strokeWidth={1.2} />
        <text x={36} y={164} fontSize={10.5} fill="var(--axis-2)" fontFamily="var(--font-ui)">Online</text>
        <text x={444} y={164} textAnchor="end" fontSize={10.5} fill="var(--axis-2)" fontFamily="var(--font-ui)">In person</text>
        <text x={256} y={324} fontSize={10.5} fill="var(--axis-1)" fontFamily="var(--font-ui)">Individual</text>
        <text x={256} y={24} fontSize={10.5} fill="var(--axis-1)" fontFamily="var(--font-ui)">Community</text>
      </motion.g>
      {LENS_NOTES.map((n, i) => (
        <Note
          key={i}
          x={lens ? n.lx - 30 : n.bx}
          y={lens ? n.ly - 22 : n.by}
          rotate={lens ? 0 : SCATTER[i].r}
          scale={lens ? 0.62 : 1}
          color={SCATTER[i].c}
          lines={SCATTER[i].l}
          delay={i * 0.03}
        />
      ))}
    </Frame>
  );
}

export function QuestionArt() {
  const step = useLoopStep(3, 2200);
  const t = useTourMotion();
  const open = step === 2;
  return (
    <Frame label="A question note asks what an in-person, community idea would look like, with a why-am-I-seeing-this disclosure">
      <Note x={28} y={36} lines={["Text", "reminders"]} color={STICKY.mint} rotate={-3} opacity={open ? 0.3 : 1} />
      <Note x={60} y={140} lines={["Ballot", "explainer"]} color={STICKY.butter} rotate={2} highlight={open} />
      <Note x={30} y={238} lines={["Vote at", "school"]} color={STICKY.blush} rotate={-1} highlight={open} />
      <QuestionNote x={step >= 1 ? 196 : 480} y={36} w={258} lines={["What would this look like if", "your neighbours ran it?"]} opacity={step >= 1 ? 1 : 0} />
      <motion.g initial={false} animate={{ opacity: step >= 1 ? 1 : 0 }} transition={t.gentle}>
        <text x={208} y={132} fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)" textDecoration="underline">
          Why am I seeing this? {open ? "▾" : "▸"}
        </text>
      </motion.g>
      <motion.g initial={false} animate={{ opacity: open ? 1 : 0, y: open ? 0 : -8 }} transition={t.gentle}>
        <rect x={196} y={146} width={258} height={128} rx={10} fill="var(--paper-raised)" stroke="var(--rule)" />
        <text x={210} y={170} fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-ui)">Empty corner</text>
        <text x={210} y={192} fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)">Nothing sits at in person +</text>
        <text x={210} y={208} fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)">community yet. Closest notes:</text>
        <text x={210} y={232} fontSize={11.5} fill="var(--signal-ink)" fontFamily="var(--font-ui)">• Ballot explainer</text>
        <text x={210} y={250} fontSize={11.5} fill="var(--signal-ink)" fontFamily="var(--font-ui)">• Vote at school</text>
      </motion.g>
    </Frame>
  );
}

const STAGES = ["Model", "Blocklist", "Judge", "Template"] as const;

export function GuardArt() {
  const step = useLoopStep(STAGES.length + 2, 1000);
  const t = useTourMotion();
  const at = Math.min(step, STAGES.length - 1);
  const caught = step >= 2;
  return (
    <Frame label="Every question passes model, blocklist, judge and template; drafts that contain ideas are replaced. 40 of 40 safe in our eval.">
      {STAGES.map((s, i) => {
        const x = 24 + i * 112;
        const active = i <= at;
        return (
          <g key={s}>
            <rect x={x} y={60} width={96} height={52} rx={10} fill={active ? "var(--paper-raised)" : "var(--paper-sunk)"} stroke={active ? "var(--ink)" : "var(--rule)"} />
            <text x={x + 48} y={91} textAnchor="middle" fontSize={13} fill="var(--ink)" fontFamily="var(--font-ui)" fontWeight={600}>
              {s}
            </text>
            {i < STAGES.length - 1 && <path d={`M ${x + 98} 86 l 12 0`} stroke="var(--ink-faint)" strokeWidth={1.4} />}
          </g>
        );
      })}
      <motion.circle r={7} cy={128} initial={false} animate={{ cx: 72 + at * 112 }} transition={t.snappy} fill="var(--signal)" />
      <motion.g initial={false} animate={{ opacity: caught ? 0.45 : 1 }} transition={t.gentle}>
        <text x={24} y={170} fontSize={12} fill="var(--ink-soft)" fontFamily="var(--font-ui)">Draft:</text>
        <text x={72} y={170} fontSize={14} fill="var(--ink)" fontFamily="var(--font-ui)" textDecoration={caught ? "line-through" : undefined}>
          “Try a voting app with rewards.”
        </text>
      </motion.g>
      <motion.g initial={false} animate={{ opacity: step >= 4 ? 1 : 0 }} transition={t.gentle}>
        <text x={24} y={200} fontSize={12} fill="var(--ink-soft)" fontFamily="var(--font-ui)">Ships:</text>
        <text x={72} y={200} fontSize={15} fontStyle="italic" fill="var(--signal-ink)" fontFamily="var(--font-display)">
          What would make voting feel worth it?
        </text>
      </motion.g>
      <text x={240} y={282} textAnchor="middle" fontSize={40} fill="var(--ink)" fontFamily="var(--font-display)">
        40/40
      </text>
      <Caption x={240} y={308} anchor="middle">
        safe in our eval: zero ideas slipped through
      </Caption>
    </Frame>
  );
}

const CONN = [
  { x: 40, y: 50, c: STICKY.butter, l: ["Free rides", "to polls"] },
  { x: 170, y: 30, c: STICKY.blush, l: ["Carpool", "board"] },
  { x: 80, y: 170, c: STICKY.mint, l: ["Van from", "senior home"] },
  { x: 330, y: 80, c: STICKY.sky, l: ["Ballot", "explainer"] },
  { x: 340, y: 230, c: STICKY.butter, l: ["Election", "holiday"] },
] as const;

const centre = (i: number) => ({ x: CONN[i].x + 48, y: CONN[i].y + 36 });

function thread(a: number, b: number): string {
  const p = centre(a);
  const q = centre(b);
  const mx = (p.x + q.x) / 2;
  return `M ${p.x} ${p.y} Q ${mx} ${Math.min(p.y, q.y) - 30} ${q.x} ${q.y}`;
}

export function ConnectionsArt() {
  const step = useLoopStep(4, 1500);
  const t = useTourMotion();
  const draw = (on: boolean) => ({ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 });
  return (
    <Frame label="Threads join related notes, a cluster outline groups them, a lone note is flagged as an island, and a person draws their own link">
      <motion.rect initial={false} animate={{ opacity: step >= 2 ? 1 : 0 }} transition={t.gentle} x={24} y={18} width={262} height={246} rx={28} fill="oklch(92% 0.06 150 / 0.25)" stroke="var(--axis-2)" strokeDasharray="6 5" />
      <motion.text initial={false} animate={{ opacity: step >= 2 ? 1 : 0 }} x={36} y={290} fontSize={11} fill="var(--axis-2)" fontFamily="var(--font-ui)">
        cluster · getting there
      </motion.text>
      {[thread(0, 1), thread(0, 2)].map((d) => (
        <motion.path key={d} d={d} fill="none" stroke="var(--ink-faint)" strokeWidth={1.4} initial={false} animate={draw(step >= 1)} transition={{ duration: t.reduce ? 0.1 : 0.8 }} />
      ))}
      <motion.path d={thread(3, 4)} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 4" initial={false} animate={draw(step >= 3)} transition={{ duration: t.reduce ? 0.1 : 0.8 }} />
      {CONN.map((n, i) => (
        <Note key={i} x={n.x} y={n.y} lines={n.l} color={n.c} rotate={i % 2 ? 2 : -2} dashed={i === 3 && step >= 2 && step < 3} />
      ))}
      <motion.text initial={false} animate={{ opacity: step === 2 ? 1 : 0 }} x={330} y={70} fontSize={11} fill="var(--ink-soft)" fontFamily="var(--font-ui)">
        island
      </motion.text>
      <motion.text initial={false} animate={{ opacity: step >= 3 ? 1 : 0 }} x={440} y={200} textAnchor="end" fontSize={11} fill="var(--ink)" fontFamily="var(--font-ui)">
        your link
      </motion.text>
    </Frame>
  );
}

export function RangeArt() {
  const step = useLoopStep(2, 3200);
  const t = useTourMotion();
  const value = useMotionValue(41);
  const shown = useTransform(value, (v) => String(Math.round(v)));
  const target = step === 1 ? 72 : 41;
  useEffect(() => {
    if (t.reduce) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, { duration: 1.2, ease: ease.outExpo });
    return () => controls.stop();
  }, [target, t.reduce, value]);
  return (
    <Frame label="The Range meter climbs from 41 to 72 as ideas reach new ground; it is a mirror, not a grade">
      <text x={48} y={80} fontSize={12} letterSpacing={1.4} fill="var(--ink-soft)" fontFamily="var(--font-ui)" fontWeight={600}>
        RANGE
      </text>
      <motion.text x={44} y={190} fontSize={112} fill="var(--ink)" fontFamily="var(--font-display)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {shown}
      </motion.text>
      <rect x={48} y={220} width={384} height={8} rx={4} fill="var(--rule)" />
      <motion.rect x={48} y={220} width={384} height={8} rx={4} fill="var(--ink)" initial={false} animate={{ scaleX: target / 100 }} transition={t.settle} style={{ transformOrigin: "0px 0px" }} />
      <motion.text initial={false} animate={{ opacity: step === 1 ? 1 : 0 }} transition={t.gentle} x={290} y={150} fontSize={15} fontStyle="italic" fill="var(--signal-ink)" fontFamily="var(--font-display)">
        New ground. 41 → 72
      </motion.text>
      <Caption x={48} y={268}>
        How spread out your ideas are across the lenses.
      </Caption>
      <Caption x={48} y={290}>
        Higher means more ground covered, not better ideas.
      </Caption>
    </Frame>
  );
}
