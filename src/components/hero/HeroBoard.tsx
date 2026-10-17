"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { ease, reducedTransition, spring } from "@/lib/motion";
import {
  CUE,
  FINAL_FRAME,
  LENS_SCALE,
  NEW_NOTE,
  NOTES,
  NOTE_H,
  NOTE_W,
  QUESTION,
  RANGE_FROM,
  RANGE_TO,
  STAGE_H,
  STAGE_W,
  THREADS,
  captionFor,
  frameAt,
  frameKey,
  type Frame,
} from "./board-script";
import { BoardAxes, BoardThreads } from "./BoardLayers";
import styles from "./board.module.css";

const TICK_MS = 40;

function useLoop(isStatic: boolean, isPaused: boolean): Frame {
  const [frame, setFrame] = useState<Frame>(() => frameAt(0));
  const elapsed = useRef(0);
  const pausedRef = useRef(isPaused);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (isStatic) return;
    let lastKey = "";
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      elapsed.current = (elapsed.current + TICK_MS) % CUE.end;
      const next = frameAt(elapsed.current);
      const key = frameKey(next);
      if (key !== lastKey) {
        lastKey = key;
        setFrame(next);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [isStatic]);

  return isStatic ? FINAL_FRAME : frame;
}

function useStageScale(ref: React.RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / STAGE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

function RangeMeter({ isOn, isStatic }: { isOn: boolean; isStatic: boolean }) {
  const value = useMotionValue(isStatic ? RANGE_TO : RANGE_FROM);
  const rounded = useTransform(value, (v) => Math.round(v));
  const fill = useTransform(value, (v) => v / 100);

  useEffect(() => {
    if (isStatic || !isOn) {
      value.set(isStatic ? RANGE_TO : RANGE_FROM);
      return;
    }
    const controls = animate(value, RANGE_TO, { duration: 1.2, ease: ease.outExpo });
    return () => controls.stop();
  }, [isOn, isStatic, value]);

  return (
    <div className={styles.meter} data-on={isOn || undefined}>
      <span className={styles.meterLabel}>Range</span>
      <motion.span className={styles.meterValue}>{rounded}</motion.span>
      <span className={styles.meterTrack}>
        <motion.span className={styles.meterFill} style={{ scaleX: fill }} />
      </span>
    </div>
  );
}

function ViewToggle({ isLens }: { isLens: boolean }) {
  return (
    <div className={styles.toggle}>
      {(["Board", "Lens"] as const).map((label) => {
        const isActive = (label === "Lens") === isLens;
        return (
          <span key={label} className={styles.toggleItem} data-active={isActive || undefined}>
            {isActive && (
              <motion.span layoutId="hero-view-pill" className={styles.togglePill} transition={spring.gentle} />
            )}
            <span className={styles.toggleText}>{label}</span>
          </span>
        );
      })}
    </div>
  );
}

function noteTarget(index: number, isLens: boolean) {
  const n = NOTES[index];
  if (!isLens) return { x: n.board.x, y: n.board.y, rotate: n.board.r, scale: 1 };
  return { x: n.lens.cx - NOTE_W / 2, y: n.lens.cy - NOTE_H / 2, rotate: n.lens.r, scale: LENS_SCALE };
}

export function HeroBoard() {
  const prefersReduced = useReducedMotion() ?? false;
  const [isPaused, setPaused] = useState(false);
  const [isHovering, setHovering] = useState(false);
  const frame = useLoop(prefersReduced, isPaused || isHovering);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scale = useStageScale(viewportRef);
  const move = prefersReduced ? reducedTransition : spring.gentle;
  const pop = prefersReduced ? reducedTransition : spring.snappy;

  const newText = NEW_NOTE.text.slice(0, frame.typed);
  const isTyping = frame.typed > 0 && frame.typed < NEW_NOTE.text.length;
  const newTarget = frame.lens
    ? { x: NEW_NOTE.lens.cx - NOTE_W / 2, y: NEW_NOTE.lens.cy - NOTE_H / 2, rotate: NEW_NOTE.lens.r, scale: 0.78 }
    : { x: NEW_NOTE.board.x, y: NEW_NOTE.board.y, rotate: NEW_NOTE.board.r, scale: 1 };

  return (
    <figure
      className={styles.frame}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <figcaption className={styles.srOnly}>
        A team adds eight onboarding ideas to a whiteboard. Blind Spot flips to Lens view and shows
        every idea sits on the incremental end. It asks a question. A person adds a radical idea in
        the empty corner, and the Range score climbs from {RANGE_FROM} to {RANGE_TO}.
      </figcaption>

      <div className={styles.chrome} aria-hidden="true">
        <span className={styles.prompt}>How might we improve onboarding?</span>
        <ViewToggle isLens={frame.lens} />
        <RangeMeter isOn={frame.meter} isStatic={prefersReduced} />
      </div>

      <div ref={viewportRef} className={styles.viewport} aria-hidden="true">
        <div
          className={styles.stage}
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, opacity: scale ? 1 : 0 }}
        >
          <BoardThreads isOn={frame.threads} count={frame.count} threads={THREADS} isReduced={prefersReduced} />
          <BoardAxes isOn={frame.lens} isHatch={frame.hatch} hasNewIdea={frame.typed > 0} isReduced={prefersReduced} />

          {!frame.lens && frame.count > 0 && frame.typed === 0 && (
            <div className={styles.ghost} style={{ left: NEW_NOTE.board.x, top: NEW_NOTE.board.y }}>
              + add an idea
            </div>
          )}

          <AnimatePresence>
            {NOTES.slice(0, frame.count).map((n, i) => (
              <motion.div
                key={n.id}
                className={styles.note}
                data-tone={n.tone}
                initial={{ ...noteTarget(i, false), y: n.board.y - 18, opacity: 0, scale: 0.86, rotate: n.board.r * 3 }}
                animate={{ ...noteTarget(i, frame.lens), opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                transition={frame.lens || i < frame.count - 1 ? move : pop}
              >
                <span className={styles.noteText}>{n.text}</span>
                <span className={styles.author}>{n.author}</span>
              </motion.div>
            ))}

            {frame.typed > 0 && (
              <motion.div
                key="new-note"
                className={`${styles.note} ${styles.noteNew}`}
                data-tone="butter"
                initial={{ ...newTarget, opacity: 0, scale: 0.5 }}
                animate={{ ...newTarget, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                transition={move}
              >
                <span className={styles.noteText}>
                  {newText}
                  {isTyping && <span className={styles.caret} />}
                </span>
                <span className={styles.author}>{NEW_NOTE.author}</span>
              </motion.div>
            )}

            {frame.question && (
              <motion.div
                key="question"
                className={styles.question}
                initial={prefersReduced ? { opacity: 0, rotate: -2 } : { opacity: 0, x: 140, y: -30, rotate: 8, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: -2, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                transition={prefersReduced ? reducedTransition : spring.flight}
              >
                <span className={styles.questionLabel}>A question for you</span>
                <span className={styles.questionText}>{QUESTION}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.footer}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={captionFor(frame)}
            className={styles.caption}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            aria-hidden="true"
          >
            {captionFor(frame)}
          </motion.p>
        </AnimatePresence>
        {!prefersReduced && (
          <button
            type="button"
            className={styles.pause}
            onClick={() => setPaused((p) => !p)}
            aria-pressed={isPaused}
            aria-label={isPaused ? "Play the board animation" : "Pause the board animation"}
          >
            {isPaused ? (
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" /></svg>
            )}
            <span>{isPaused ? "Play" : isHovering ? "Paused" : "Pause"}</span>
          </button>
        )}
      </div>
    </figure>
  );
}
