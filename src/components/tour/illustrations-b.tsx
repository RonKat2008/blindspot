"use client";

// Chapters 9–16: converge → decided by humans.
import { motion } from "motion/react";
import { Caption, Frame, Note, STICKY, useLoopStep, useTourMotion } from "./primitives";

function Label({ x, y, children, fill = "var(--ink-soft)" }: { x: number; y: number; children: string; fill?: string }) {
  return (
    <text x={x} y={y} fontSize={9} letterSpacing={1.3} fontWeight={600} fill={fill} fontFamily="var(--font-ui)">
      {children}
    </text>
  );
}

export function ConvergeArt() {
  const step = useLoopStep(3, 2000);
  const t = useTourMotion();
  const picks = [
    { l: ["Free rides", "to polls"], c: STICKY.butter },
    { l: ["Text", "reminders"], c: STICKY.mint },
    { l: ["Block", "parties"], c: STICKY.blush },
  ];
  return (
    <Frame label="An assumption card names what the room takes for granted; converge mode checks the shortlist covers two of four lenses">
      <rect x={24} y={24} width={432} height={66} rx={12} fill="var(--paper-raised)" stroke="var(--rule)" />
      <Label x={40} y={46}>ASSUMPTION</Label>
      <text x={40} y={72} fontSize={15} fontStyle="italic" fill="var(--ink)" fontFamily="var(--font-display)">
        Everyone can take an afternoon off to vote.
      </text>
      <Label x={24} y={122}>YOUR SHORTLIST</Label>
      {picks.map((p, i) => (
        <g key={i}>
          <Note x={24 + i * 112} y={step >= 1 ? 134 : 160} lines={p.l} color={p.c} opacity={step >= 1 ? 1 : 0} rotate={i - 1} delay={i * 0.08} />
          <motion.circle initial={false} animate={{ opacity: step >= 1 ? 1 : 0 }} cx={110 + i * 112} cy={138} r={9} fill="var(--accept)" />
          <motion.path initial={false} animate={{ opacity: step >= 1 ? 1 : 0 }} d={`M ${105 + i * 112} 138 l 4 4 l 6 -7`} stroke="white" strokeWidth={2} fill="none" />
        </g>
      ))}
      <motion.g initial={false} animate={{ opacity: step === 2 ? 1 : 0, y: step === 2 ? 0 : 8 }} transition={t.gentle}>
        <rect x={24} y={232} width={432} height={80} rx={12} fill="var(--signal-wash)" stroke="var(--signal)" />
        <Label x={40} y={254} fill="var(--signal-ink)">SHORTLIST CHECK</Label>
        <text x={40} y={280} fontSize={15} fontStyle="italic" fill="var(--signal-ink)" fontFamily="var(--font-display)">
          Covers 2 of 4 lenses. Nothing here is long-term.
        </text>
        <text x={40} y={300} fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)">
          Keep it, or look again. Your call.
        </text>
      </motion.g>
    </Frame>
  );
}

// Deterministic faux-QR pattern.
const QR = Array.from({ length: 81 }, (_, i) => ((i * 37 + (i % 7) * 11) % 5 < 2 ? 1 : 0));

export function PhonesArt() {
  const step = useLoopStep(3, 2000);
  const t = useTourMotion();
  const notes = [
    { x: 248, y: 70, l: ["Walk to", "vote day"], c: STICKY.butter, r: -4 },
    { x: 350, y: 66, l: ["Teen poll", "workers"], c: STICKY.blush, r: 3 },
    { x: 300, y: 168, l: ["Ballot in", "5 languages"], c: STICKY.sky, r: -1 },
  ];
  return (
    <Frame label="Scan a QR code to join from a phone, snap a photo of paper sticky notes, and confirm how they split">
      <rect x={36} y={30} width={150} height={282} rx={24} fill="var(--paper-raised)" stroke="var(--ink)" strokeWidth={2} />
      <rect x={90} y={40} width={42} height={6} rx={3} fill="var(--rule)" />
      <g transform="translate(62 72)">
        {QR.map((on, i) =>
          on ? <rect key={i} x={(i % 9) * 11} y={Math.floor(i / 9) * 11} width={10} height={10} fill="var(--ink)" /> : null,
        )}
        {[0, 66].map((x) => [0, 66].filter((y) => !(x === 66 && y === 66)).map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={32} height={32} fill="none" stroke="var(--ink)" strokeWidth={6} />
        )))}
      </g>
      <text x={111} y={200} textAnchor="middle" fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)">Add ideas from</text>
      <text x={111} y={216} textAnchor="middle" fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)">your phone</text>
      <motion.g initial={false} animate={{ opacity: step === 2 ? 1 : 0.35 }} transition={t.gentle}>
        <rect x={58} y={254} width={106} height={34} rx={17} fill="var(--ink)" />
        <text x={111} y={275} textAnchor="middle" fontSize={12} fill="var(--paper-raised)" fontFamily="var(--font-ui)">Looks right ✓</text>
      </motion.g>
      <rect x={226} y={40} width={230} height={250} rx={8} fill="oklch(88% 0.02 70)" stroke="var(--rule)" />
      <Label x={238} y={58}>YOUR PHOTO</Label>
      {notes.map((n, i) => (
        <g key={i}>
          <Note x={n.x} y={n.y} lines={n.l} color={n.c} rotate={n.r} w={88} h={68} />
          <motion.rect
            initial={false}
            animate={{ opacity: step >= 1 ? 1 : 0 }}
            transition={{ ...t.gentle, delay: t.reduce ? 0 : i * 0.12 }}
            x={n.x - 6}
            y={n.y - 6}
            width={100}
            height={82}
            rx={6}
            fill="none"
            stroke="var(--signal)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        </g>
      ))}
      <Caption x={341} y={316} anchor="middle" tone={step === 2 ? "signal" : "soft"}>
        {step === 0 ? "Snap the wall" : step === 1 ? "Split into 3 notes?" : "You confirm the split"}
      </Caption>
    </Frame>
  );
}

export function AmbientArt() {
  const step = useLoopStep(2, 3000);
  const t = useTourMotion();
  const wide = step === 1;
  return (
    <Frame label="The ambient room view glows cool teal when ideas bunch up and warm amber when they spread out">
      <motion.rect
        x={24}
        y={24}
        width={432}
        height={292}
        rx={16}
        initial={false}
        animate={{ fill: wide ? "oklch(86% 0.1 70)" : "oklch(84% 0.06 190)" }}
        transition={{ duration: t.reduce ? 0.1 : 1.6 }}
      />
      <motion.circle
        cx={240}
        cy={150}
        initial={false}
        animate={{ r: wide ? 110 : 60, fill: wide ? "oklch(78% 0.15 65)" : "oklch(72% 0.09 190)" }}
        transition={{ duration: t.reduce ? 0.1 : 1.6 }}
        opacity={0.7}
        style={{ filter: "blur(24px)" }}
      />
      <text x={240} y={150} textAnchor="middle" fontSize={56} fill="var(--ink)" fontFamily="var(--font-display)">
        {wide ? "74" : "38"}
      </text>
      <text x={240} y={186} textAnchor="middle" fontSize={16} fontStyle="italic" fill="var(--ink)" fontFamily="var(--font-display)">
        {wide ? "The room is spreading out." : "Ideas are bunching up."}
      </text>
      <Caption x={240} y={296} anchor="middle" tone="ink">
        On the big screen, no one has to read a chart.
      </Caption>
    </Frame>
  );
}

const EVIDENCE = [
  ["What's been tried", "Pilots in other cities"],
  ["What's known", "Who it reached, who it missed"],
  ["Still open", "Cost per extra voter"],
] as const;

export function RealityArt() {
  const step = useLoopStep(EVIDENCE.length + 2, 1100);
  const t = useTourMotion();
  return (
    <Frame label="A reality check from Glasser returns evidence with sources about a note, not new ideas">
      <Note x={28} y={40} lines={["Election", "holiday"]} color={STICKY.sky} rotate={-3} highlight={step >= 1} />
      <rect x={150} y={28} width={306} height={284} rx={14} fill="var(--paper-raised)" stroke="var(--rule)" />
      <Label x={168} y={54}>REALITY CHECK · GLASSER</Label>
      <text x={168} y={80} fontSize={15} fontStyle="italic" fill="var(--ink)" fontFamily="var(--font-display)">
        Evidence, not ideas.
      </text>
      {EVIDENCE.map(([k, v], i) => (
        <motion.g key={k} initial={false} animate={{ opacity: step > i ? 1 : 0, x: step > i ? 0 : 10 }} transition={t.gentle}>
          <line x1={168} x2={438} y1={100 + i * 64} y2={100 + i * 64} stroke="var(--rule)" />
          <text x={168} y={124 + i * 64} fontSize={11} fill="var(--ink-soft)" fontFamily="var(--font-ui)">{k}</text>
          <text x={168} y={144 + i * 64} fontSize={13.5} fill="var(--ink)" fontFamily="var(--font-ui)">{v}</text>
          <rect x={384} y={112 + i * 64} width={54} height={20} rx={10} fill="var(--paper-sunk)" stroke="var(--rule)" />
          <text x={411} y={126 + i * 64} textAnchor="middle" fontSize={10} fill="var(--ink-soft)" fontFamily="var(--font-ui)">source</text>
        </motion.g>
      ))}
    </Frame>
  );
}

const PEOPLE = [
  { n: "M", c: "var(--axis-1)" },
  { n: "J", c: "var(--axis-0)" },
  { n: "R", c: "var(--axis-2)" },
] as const;

export function AsyncArt() {
  const step = useLoopStep(2, 2600);
  const t = useTourMotion();
  return (
    <Frame label="A boards list with invited teammates and a while-you-were-away recap of what changed">
      {["Get out the vote", "Campus greener", "Onboarding v2"].map((title, i) => (
        <g key={title}>
          <rect x={24} y={28 + i * 58} width={220} height={46} rx={10} fill="var(--paper-raised)" stroke={i === 0 ? "var(--ink)" : "var(--rule)"} />
          <text x={40} y={56 + i * 58} fontSize={13} fill="var(--ink)" fontFamily="var(--font-ui)">{title}</text>
          {i === 0 &&
            PEOPLE.map((p, j) => (
              <g key={p.n}>
                <circle cx={196 + j * 14} cy={51} r={10} fill={p.c} stroke="var(--paper-raised)" strokeWidth={2} />
                <text x={196 + j * 14} y={55} textAnchor="middle" fontSize={10} fill="white" fontFamily="var(--font-ui)">{p.n}</text>
              </g>
            ))}
        </g>
      ))}
      <rect x={24} y={210} width={220} height={40} rx={10} fill="none" stroke="var(--ink-faint)" strokeDasharray="5 4" />
      <text x={134} y={235} textAnchor="middle" fontSize={12} fill="var(--ink-soft)" fontFamily="var(--font-ui)">+ Invite a teammate</text>
      <motion.g initial={false} animate={{ opacity: step === 1 ? 1 : 0, x: step === 1 ? 0 : 24 }} transition={t.gentle}>
        <rect x={262} y={28} width={194} height={222} rx={14} fill="var(--paper-raised)" stroke="var(--rule)" />
        <Label x={278} y={52}>WHILE YOU WERE AWAY</Label>
        <text x={278} y={84} fontSize={13} fill="var(--ink)" fontFamily="var(--font-ui)">Maya added 3 notes</text>
        <text x={278} y={110} fontSize={13} fill="var(--ink)" fontFamily="var(--font-ui)">Jon drew 1 link</text>
        <text x={278} y={136} fontSize={13} fontStyle="italic" fill="var(--signal-ink)" fontFamily="var(--font-display)">1 new question</text>
        <text x={278} y={170} fontSize={12} fill="var(--ink-soft)" fontFamily="var(--font-ui)">Range</text>
        <text x={278} y={204} fontSize={30} fill="var(--ink)" fontFamily="var(--font-display)">52 → 61</text>
      </motion.g>
      <Caption x={24} y={300}>
        Sign in once. Everyone thinks on their own time.
      </Caption>
    </Frame>
  );
}

const REPLAY = [
  { x: 40, y: 40, c: STICKY.butter, l: ["Free rides", "to polls"] },
  { x: 160, y: 60, c: STICKY.blush, l: ["Vote at", "school"] },
  { x: 290, y: 36, c: STICKY.mint, l: ["Text", "reminders"] },
  { x: 90, y: 150, c: STICKY.sky, l: ["Election", "holiday"] },
  { x: 230, y: 150, c: STICKY.butter, l: ["Block", "parties"] },
] as const;

export function ReplayArt() {
  const step = useLoopStep(REPLAY.length + 2, 900);
  const t = useTourMotion();
  const shown = Math.min(step + 1, REPLAY.length);
  const pct = shown / REPLAY.length;
  return (
    <Frame label="Scrub a replay of how the board grew, then share a recap link">
      {REPLAY.map((n, i) => (
        <Note key={i} x={n.x} y={n.y} lines={n.l} color={n.c} rotate={i % 2 ? 2 : -2} opacity={i < shown ? 1 : 0} scale={i < shown ? 1 : 0.7} />
      ))}
      <line x1={40} x2={440} y1={268} y2={268} stroke="var(--rule)" strokeWidth={4} strokeLinecap="round" />
      <motion.line x1={40} y1={268} y2={268} initial={false} animate={{ x2: 40 + 400 * pct }} transition={t.snappy} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" />
      <motion.circle cy={268} r={9} initial={false} animate={{ cx: 40 + 400 * pct }} transition={t.snappy} fill="var(--paper-raised)" stroke="var(--ink)" strokeWidth={2} />
      <text x={40} y={300} fontSize={11.5} fill="var(--ink-soft)" fontFamily="var(--font-ui)">0:00</text>
      <motion.g initial={false} animate={{ opacity: step >= REPLAY.length ? 1 : 0.4 }} transition={t.gentle}>
        <rect x={322} y={284} width={118} height={30} rx={15} fill="var(--ink)" />
        <text x={381} y={303} textAnchor="middle" fontSize={11.5} fill="var(--paper-raised)" fontFamily="var(--font-ui)">Copy recap link</text>
      </motion.g>
    </Frame>
  );
}

const SESSIONS = [44, 58, 51, 66, 61, 73] as const;
const LENS_NAMES = ["Cheap", "Online", "Community", "Long-term"] as const;

export function TeamArt() {
  const step = useLoopStep(2, 2600);
  const t = useTourMotion();
  return (
    <Frame label="Team insights: Range across six sessions, and a lens grid showing long-term is skipped every time">
      <Label x={28} y={40}>RANGE BY SESSION</Label>
      {SESSIONS.map((v, i) => (
        <g key={i}>
          <rect x={36 + i * 70} y={60} width={34} height={100} rx={4} fill="var(--paper-raised)" stroke="var(--rule)" />
          <motion.rect
            x={36 + i * 70}
            y={60}
            width={34}
            height={100}
            rx={4}
            fill="var(--ink)"
            initial={false}
            animate={{ scaleY: step === 1 ? v / 100 : 0.08 }}
            transition={{ ...t.settle, delay: t.reduce ? 0 : i * 0.06 }}
            style={{ transformOrigin: "50% 100%", transformBox: "fill-box" }}
          />
          <text x={53 + i * 70} y={178} textAnchor="middle" fontSize={11} fill="var(--ink-soft)" fontFamily="var(--font-ui)">S{i + 1}</text>
        </g>
      ))}
      {LENS_NAMES.map((name, r) => (
        <g key={name}>
          <text x={28} y={210 + r * 24} fontSize={11} fill={r === 3 ? "var(--signal-ink)" : "var(--ink-soft)"} fontFamily="var(--font-ui)">{name}</text>
          {SESSIONS.map((_, c) => (
            <circle
              key={c}
              cx={53 + c * 70 + 40}
              cy={206 + r * 24}
              r={6}
              fill={r === 3 ? "none" : `var(--axis-${r})`}
              stroke={r === 3 ? "var(--signal)" : "none"}
              strokeDasharray={r === 3 ? "3 2" : undefined}
              strokeWidth={1.5}
            />
          ))}
        </g>
      ))}
      <motion.text initial={false} animate={{ opacity: step === 1 ? 1 : 0 }} transition={t.gentle} x={452} y={326} textAnchor="end" fontSize={14} fontStyle="italic" fill="var(--signal-ink)" fontFamily="var(--font-display)">
        Long-term: skipped 6 sessions running.
      </motion.text>
    </Frame>
  );
}

export function HumansArt() {
  const step = useLoopStep(3, 1800);
  const t = useTourMotion();
  return (
    <Frame label="The ledger: you wrote 14 ideas, AI wrote 0. It asked 4 questions and you took 3.">
      <text x={40} y={110} fontSize={40} fill="var(--ink)" fontFamily="var(--font-display)">
        You wrote 14 ideas.
      </text>
      <motion.text initial={false} animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 8 }} transition={t.gentle} x={40} y={170} fontSize={40} fill="var(--signal-ink)" fontStyle="italic" fontFamily="var(--font-display)">
        AI wrote 0.
      </motion.text>
      <motion.text initial={false} animate={{ opacity: step >= 2 ? 1 : 0 }} transition={t.gentle} x={40} y={222} fontSize={16} fill="var(--ink-soft)" fontFamily="var(--font-ui)">
        It asked 4 questions. You took 3.
      </motion.text>
      <line x1={40} x2={440} y1={262} y2={262} stroke="var(--rule)" />
      <Caption x={40} y={292}>
        AI maps, connects and asks. People write and decide.
      </Caption>
    </Frame>
  );
}
