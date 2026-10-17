# Blind Spot — UI direction

**Direction: "Field notebook."** Editorial and light: warm paper, ink-dark type, one serif display face for the human voice (prompts, questions, the ledger) and one grotesk for UI. The map looks like a hand-ruled chart in a notebook, not a dashboard. Colour is semantic: each axis gets a pencil colour, and **signal amber** is used for gaps and the AI's questions only. The AI's voice is always italic serif in amber-ink; the human's ideas are always upright grotesk in ink. That split is the thesis made visual.

No dark mode. No gradient blobs. No card grids.

## 1. Tokens (paste into `src/app/globals.css` `:root`, map into `@theme inline`)

```css
:root {
  /* paper + ink */
  --paper: oklch(97.5% 0.012 85);        /* page */
  --paper-raised: oklch(99% 0.006 85);   /* cards, input */
  --paper-sunk: oklch(94% 0.016 85);     /* map plot area */
  --rule: oklch(86% 0.02 80);            /* hairlines, grid */
  --ink: oklch(22% 0.02 60);             /* body text */
  --ink-soft: oklch(45% 0.02 60);        /* secondary text */
  --ink-faint: oklch(62% 0.015 60);      /* placeholders, axis ticks */

  /* semantic */
  --signal: oklch(72% 0.17 62);          /* amber: gaps, AI questions, the empty region */
  --signal-ink: oklch(45% 0.13 55);      /* amber text on paper (AA) */
  --signal-wash: oklch(94% 0.05 75);     /* gap region fill, card bg */
  --human: oklch(22% 0.02 60);           /* idea dots = ink */
  --accept: oklch(55% 0.12 160);         /* accepted provocation tick */
  --calm: oklch(70% 0.09 190);           /* ambient low-diversity teal */

  /* axis pencils (by axis.position) */
  --axis-0: oklch(55% 0.13 250);  /* blue */
  --axis-1: oklch(55% 0.14 330);  /* plum */
  --axis-2: oklch(58% 0.12 150);  /* green */
  --axis-3: oklch(58% 0.13 30);   /* brick */
  --axis-4: oklch(55% 0.10 280);  /* violet */
  --axis-5: oklch(55% 0.08 200);  /* slate teal */

  /* type */
  --font-display: var(--font-fraunces);  /* next/font/google Fraunces, opsz axis, 400/600 + italic */
  --font-ui: var(--font-geist-sans);     /* already loaded */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: clamp(1rem, 0.95rem + 0.2vw, 1.0625rem);
  --text-lg: 1.25rem;
  --text-question: clamp(1.375rem, 1.1rem + 1vw, 1.75rem); /* provocation text */
  --text-hero: clamp(2.5rem, 1.5rem + 4vw, 4.5rem);        /* landing headline, ledger */

  /* space: deliberate rhythm, not uniform */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-section: clamp(3rem, 2rem + 4vw, 6rem);

  --radius-sm: 6px;   /* chips */
  --radius-md: 12px;  /* inputs */
  --radius-lg: 20px;  /* provocation card */
  --shadow-card: 0 1px 0 var(--rule), 0 12px 32px -12px oklch(30% 0.04 60 / 0.18);
  --shadow-input: 0 -8px 24px -12px oklch(30% 0.04 60 / 0.15);
}
```

Fonts in `layout.tsx`: keep Geist; add `Fraunces({ subsets:["latin"], variable:"--font-fraunces", style:["normal","italic"], axes:["opsz"] })`. Max two families. Subtle paper grain: one inline SVG `feTurbulence` noise at 3% opacity on `body::before` (static, no animation).

## 2. Voice and microcopy rules
- Second person, short, warm. Sentence case. No jargon: say "lens" not "axis" in the UI (code still says axis); "spread" not "diversity" in body copy, but the meter is labelled **Range**.
- Never "AI suggests…". The AI only **asks**. Card header: *A question for you*.
- Errors say what to do: "Couldn't reach the map. Your idea is safe — try again."
- Buttons are verbs: **Start**, **Looks good**, **Add**, **Take it**, **Not now**, **Wrap up**.
- Empty states teach (see screens).

## 3. Screens (one primary action per screen, always the ink-filled button)

### A. Landing + prompt entry (`/`)
- Left-aligned, generous margin. Hero in Fraunces: *"Find the ideas you're not having."* Sub (grotesk, ink-soft): "Type your ideas. Blind Spot maps them and asks one question at a time about what's missing. It never gives you an idea."
- One large textarea: placeholder "What are you brainstorming? e.g. How might we…". Enter submits (Shift+Enter newline).
- Below: 3 example chips, one click fills and submits: "How might we improve onboarding for new users?", "How might we make our campus greener?", "How might we get more people to vote?"
- Optional team name as a small inline text link "+ add team name".
- Primary: **Start**. Loading state: button text becomes "Finding lenses…" with a 3-dot ink pulse.

### B. Lens review (`/s/[id]/axes`)
- Heading (Fraunces): "Here are 5 lenses for your problem."
- Explainer line in a ruled callout: **"These are lenses, not answers.** Each one is a spectrum your ideas can land anywhere on. Edit any word that doesn't fit."
- Each lens is one row: colour pencil swatch, `poleA ←———→ poleB` with both poles as inline-editable text (click to edit, Enter to save, Esc to cancel, pencil icon on hover). Tooltip on the row: "We'll place each idea somewhere between these two ends."
- Remove (×, faint) and "+ add a lens" (max 6, min 2).
- Primary: **Looks good** → canvas.

### C. Brainstorm canvas (`/s/[id]`) — the hero
Layout (≥1024px): map takes ~65% left; right rail 360px holds Range meter (top), provocation card (middle), QR join panel (bottom, collapsible). Below 1024px the rail stacks under the map. Idea input is **pinned to the bottom** full width, `--shadow-input`.

- **Idea input**: big (text-lg), placeholder "Add an idea — anything goes", Enter adds, auto-focused, clears instantly (optimistic). Tiny hint right-aligned: "Enter ↵ to add". Speaker name chip optional.
- **Map**: SVG square plot on `--paper-sunk` with hairline ruled grid. Axis selectors are two small dropdown chips on the X and Y ends, coloured by the axis pencil, showing `poleA ↔ poleB`; default X = position 0, Y = position 1. Pole labels sit at the four edge midpoints in the axis colour. Toggle "Overview" (PCA) as a quiet text button top-right.
  - Dots: 10px ink circles; hover shows the idea text in a paper tooltip; the newest dot has a 1px ring for 3s.
  - **Empty quadrant**: any quadrant with 0 ideas gets a `--signal-wash` fill with a dashed amber border and a faint italic label "nothing here yet". This is the picture the provocation points at.
- **Range meter**: big numeral (Fraunces, tabular) 0–100 with a thin bar; label **Range** with an (i) tooltip: "How spread out your ideas are across the lenses. Higher means you're covering more ground — not that the ideas are better." Breakdown on hover: spread / coverage as two small bars.
- **Provocation card**: slides in from the right (`cardSlide`). Small caps label "A QUESTION FOR YOU", question in Fraunces italic `--text-question`, `--signal-ink`. Actions: **Take it** (primary — focuses the idea input with placeholder "Your answer to the question…") and **Not now** (ghost). Disclosure "Why am I seeing this?" expands (layout animation) to show: pattern name in plain words (gap → "Empty corner", fixation → "Circling one spot", duplicate → "Twin ideas", abandoned → "A lonely idea", unexplored → "Unused lens"), the `why.explanation` sentence, and the referenced ideas as a small list; while open, referenced dots get an amber ring on the map and all others drop to 30% opacity. Only one card at a time; dismissed cards collapse to a counter "2 earlier questions" (expandable list).
- **QR panel**: `qrcode.react` `QRCodeSVG` of `${origin}/join/${id}`, 120px, caption "Add ideas from your phone".
- **Empty states**: 0 ideas → map shows a centred italic line "Add your first idea — anything goes. Your ideas will appear here." with a soft arrow down to the input. 1–2 ideas → rail says "Questions start after 3 ideas."
- Header: prompt in Fraunces (truncate), and **Wrap up** as a quiet secondary text button (the input is the primary action here).

### D. Summary (`/s/[id]/summary`)
- The ledger, huge, Fraunces: **"You wrote 14 ideas. AI wrote 0."** Second line smaller: "It asked 4 questions. You took 3."
- Final map (read-only, static) + Range start → end ("41 → 72").
- List of ideas grouped by which question they answered (ideas added within 2 minutes after an accepted provocation).
- Primary: **Copy ideas** (markdown to clipboard). Secondary: "Start a new brainstorm".

## 4. First-run tour (canvas only, skippable)
3 coachmarks, shown once (`localStorage["bs-tour-done"]`, wrapped in try/catch), each a small paper popover with an arrow and "Next / Skip tour", step dots:
1. Input — "Type an idea and press Enter. Quantity beats polish."
2. Map — "Each dot is your idea, placed on two lenses. Empty corners are where you haven't looked."
3. Rail — "Every few ideas, Blind Spot asks one question. It will never give you an idea — that's your job."
Esc skips. Focus is trapped in the popover; returns to the input after.

## 5. Accessibility + keyboard
- Enter adds idea; `/` focuses input from anywhere; `A` / `D` on the card = Take it / Not now when focus is not in an input; `?` reopens the tour.
- All tooltips are focusable (button + `aria-describedby`). Map dots are `<button>`s with `aria-label` = idea text; the SVG has a visually hidden list fallback.
- Colour never carries meaning alone: gap region also has a dashed border + label. Contrast ≥ 4.5:1 for text (use `--signal-ink`, not `--signal`, for amber text).

## 6. Motion spec (import from `src/lib/motion.ts`)
- **Reduced motion**: `useReducedMotion()` from `motion/react`; when true use `reducedTransition` everywhere, no ring pulses, number jumps without counting.
- **Dot entry**: a dot is rendered at the input's position (measure input rect relative to the SVG) and animates to its plotted x/y with `spring.flight`, scale 0.2→1, opacity 0→1 (`dotEnter`). Positions animate via `transform` only (`motion.g` with `x`/`y` or `cx`/`cy` via motion values) — when axes change, all dots re-flow with `spring.gentle`.
- **Provocation card**: `AnimatePresence mode="popLayout"` + `cardSlide`; "why?" disclosure uses `layout` with `spring.gentle`.
- **The Reveal** (screenshot moment, polish here first): when a new idea lands in a quadrant that was empty before it was added → (1) the amber wash fades out over 600ms, (2) two staggered `revealRing` pulses from the dot (amber stroke), (3) the Range numeral counts up from old to new over 1.2s (`animate(from, to, { duration: 1.2, ease: ease.outExpo })` driving a motion value rendered with `Math.round`), and the bar follows with `spring.settle`, (4) a one-line toast in the rail: "New ground. Range 41 → 58."
- **Chips/buttons**: `whileTap={{ scale: 0.97 }}` with `spring.snappy`; hover lifts 1px.
- Never animate width/height/top/left; use transform/opacity.

## 7. Ambient page (`/ambient/[id]`)
Full-screen, no chrome. Background colour interpolated in OKLCH from `--calm` (diversity 0) to `--signal` (diversity 100), transitioning over 2s. Centred: the Range numeral in huge Fraunces, the prompt beneath in small caps, and the current question (if any) in italic. Polls state every 1s.
