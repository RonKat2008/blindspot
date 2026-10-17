"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RealityButton } from "@/components/reality-button";
import { api } from "@/lib/api-client";
import type { Idea, Provocation, SessionState } from "@/lib/contract";
import type { AuthoredIdea } from "@/lib/supabase/account-types";
import { spring } from "@/lib/motion";
import { AccountMenu } from "@/components/account/account-menu";
import { AwayDigest } from "@/components/account/away-digest";
import { InviteButton } from "@/components/account/invite-button";
import { LensChips, PhoneQrButton, PromptEntry } from "./board-header";
import type { HumanLink, PosMap, QuadKey } from "./board-utils";
import {
  connectionsOf,
  hasEdge,
  LENS_SCALE,
  lensPoint,
  nextFreeSpot,
  plotBox,
  quadOf,
  randomRot,
  STICKY_H,
  STICKY_W,
  stickyColor,
  store,
} from "./board-utils";
import { BoardCoach, QuestionNote, type QuestionNoteData, RangeMeter, toNote } from "./chrome";
import { ConnectionsLayer, LensGrid } from "./layers";
import { DraftSticky, Sticky } from "./sticky";
import { WrapUp } from "./wrap-up";
import { AssumptionWriter, ConvergeDrawer, patchIdea } from "./extras";
import { ReplayTimeline } from "@/components/replay/replay-timeline";
import { AssumptionCard } from "@/components/assumption/assumption-card";

type Pending = { tempId: string; text: string };
type Draft = { x: number; y: number; text: string };

const POLL_MS = 5000;
const ERR_ADD = "Couldn't reach the map. Your idea is safe — try again.";

function usableWidth(width: number): number {
  return width >= 1024 ? width - 400 : width;
}

function placeMissing(ideas: Idea[], positions: PosMap, width: number): PosMap {
  const missing = ideas.filter((i) => !positions[i.id]);
  if (!missing.length) return positions;
  const next = { ...positions };
  for (const idea of missing) next[idea.id] = nextFreeSpot(Object.values(next), usableWidth(width));
  return next;
}

/** Deterministic board layout (scripted mode): grid order, rotation hashed from the id. */
function autoLayout(ideas: Idea[], width: number): PosMap {
  const out: PosMap = {};
  for (const idea of ideas) {
    const spot = nextFreeSpot(Object.values(out), usableWidth(width));
    let h = 0;
    for (const ch of idea.id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
    out[idea.id] = { x: spot.x, y: spot.y, rot: ((h % 60) - 30) / 10 };
  }
  return out;
}

function emptyState(id: string, prompt: string, axes: SessionState["axes"]): SessionState {
  return {
    session: { id, prompt, teamName: null, createdAt: new Date().toISOString() },
    axes,
    ideas: [],
    provocations: [],
    diversity: 0,
    diversityBreakdown: { spread: 0, coverage: 0 },
  };
}

export type BoardSnapshot = {
  state: SessionState;
  draft: string;
  view: "board" | "lens";
  whyOpen: boolean;
  freshIds: string[];
  revealId: string | null;
};

/**
 * The whiteboard. Live mode: pass `sessionId` (or nothing for a fresh board).
 * Scripted mode: pass `snapshot` (the /demo tour) — no network, no input, layout is deterministic.
 */
export function Board({ sessionId: initialId, snapshot }: { sessionId?: string; snapshot?: BoardSnapshot }) {
  const reduce = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(initialId ?? null);
  const [promptRaw, setPrompt] = useState<string | null>(null);
  const [stateRaw, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(Boolean(initialId));
  const [finding, setFinding] = useState(false);
  const [savingAxes, setSavingAxes] = useState(false);
  const [posRaw, setPositions] = useState<PosMap>({});
  const [keyMap, setKeyMap] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lensRaw, setLens] = useState(false);
  const [xId, setXId] = useState<string | null>(null);
  const [yId, setYId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [whyRaw, setWhyOpen] = useState(false);
  const [localNote, setLocalNote] = useState<(QuestionNoteData & { ids: string[] }) | null>(null);
  const [links, setLinks] = useState<HumanLink[]>([]);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [linkDrag, setLinkDrag] = useState<{ from: string; x: number; y: number } | null>(null);
  const [showConn, setShowConn] = useState(true);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [coachStep, setCoachStep] = useState(initialId ? 1 : 0);
  const [wrapOpen, setWrapOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [digestIds, setDigestIds] = useState<string[]>([]);
  const [replayOn, setReplayOn] = useState(false);
  const [replayFrame, setReplayFrame] = useState<{ ideas: Set<string>; questions: Set<string> } | null>(null);
  const [convergeOn, setConvergeOn] = useState(false);
  const [assumptionOpen, setAssumptionOpen] = useState(false);
  const scripted = Boolean(snapshot);
  const state = snapshot ? snapshot.state : stateRaw;
  const prompt = snapshot ? snapshot.state.session.prompt : promptRaw;
  const lens = snapshot ? snapshot.view === "lens" : lensRaw;
  const whyOpen = snapshot ? snapshot.whyOpen : whyRaw;
  const positions = useMemo(
    () => (snapshot ? autoLayout(snapshot.state.ideas, size.w) : posRaw),
    [snapshot, size.w, posRaw],
  );
  const freshRef = useRef<Set<string>>(new Set());
  const lastMutation = useRef(0);
  const sessionRef = useRef<string | null>(initialId ?? null);
  const queuedRef = useRef<Pending[]>([]);
  const suppressClick = useRef(false);

  // ---- measure the board viewport
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyState = useCallback((next: SessionState) => {
    setState(next);
    setPrompt(next.session.prompt);
    setXId((cur) => (cur && next.axes.some((a) => a.id === cur) ? cur : next.axes[0]?.id ?? null));
    setYId((cur) => (cur && next.axes.some((a) => a.id === cur) ? cur : next.axes[1]?.id ?? next.axes[0]?.id ?? null));
    const w = viewportRef.current?.clientWidth ?? 1200;
    setPositions((prev) => placeMissing(next.ideas, prev, w));
  }, []);

  // ---- load an existing session
  useEffect(() => {
    if (!initialId) return;
    let cancelled = false;
    api
      .getState(initialId)
      .then((next) => {
        if (cancelled) return;
        setPositions(store.positions(initialId));
        setLinks(store.links(initialId));
        applyState(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast(err instanceof Error ? err.message : "Couldn't open this board.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialId, applyState]);

  // ---- poll so phone contributions show up
  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const started = Date.now();
      api
        .getState(sessionId)
        .then((next) => {
          if (lastMutation.current > started) return;
          applyState(next);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [sessionId, applyState]);

  // ---- persist board-only data
  useEffect(() => {
    if (sessionId) store.savePositions(sessionId, positions);
  }, [sessionId, positions]);
  useEffect(() => {
    if (sessionId) store.saveLinks(sessionId, links);
  }, [sessionId, links]);

  // ---- ideas
  const postIdea = useCallback(
    async (sid: string, tempId: string, text: string) => {
      try {
        const res = await api.addIdeas(sid, { texts: [text], source: "typed" });
        lastMutation.current = Date.now();
        const landed = res.ideas[0];
        if (landed) {
          setKeyMap((m) => ({ ...m, [landed.id]: tempId }));
          setPositions((p) => (p[tempId] ? { ...p, [landed.id]: p[tempId] } : p));
        }
        setPending((list) => list.filter((x) => x.tempId !== tempId));
        setState((prev) => {
          if (!prev) return prev;
          if (res.diversity - prev.diversity >= 5) toast(`New ground. Range ${prev.diversity} → ${res.diversity}.`);
          return {
            ...prev,
            ideas: res.allIdeas,
            diversity: res.diversity,
            diversityBreakdown: res.diversityBreakdown,
            provocations: res.provocation ? [...prev.provocations, res.provocation] : prev.provocations,
          };
        });
        if (res.provocation) setWhyOpen(false);
      } catch {
        setPending((list) => list.filter((x) => x.tempId !== tempId));
        toast(ERR_ADD, {
          action: { label: "Retry", onClick: () => addIdea(text) },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addIdea = useCallback(
    (text: string, at?: { x: number; y: number }) => {
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      freshRef.current.add(tempId);
      setPositions((p) => ({
        ...p,
        [tempId]: at ? { ...at, rot: randomRot() } : nextFreeSpot(Object.values(p), usableWidth(viewportRef.current?.clientWidth ?? 1200)),
      }));
      setPending((list) => [...list, { tempId, text }]);
      if (coachStep === 1) setCoachStep(2);
      const sid = sessionRef.current;
      if (sid) void postIdea(sid, tempId, text);
      else queuedRef.current.push({ tempId, text });
    },
    [postIdea, coachStep],
  );

  // ---- create the session from the heading
  async function startSession(value: string) {
    setPrompt(value);
    setFinding(true);
    setCoachStep((s) => Math.max(s, 1));
    try {
      const { sessionId: sid, axes } = await api.createSession({ prompt: value });
      sessionRef.current = sid;
      setSessionId(sid);
      setState(emptyState(sid, value, axes));
      setXId(axes[0]?.id ?? null);
      setYId(axes[1]?.id ?? axes[0]?.id ?? null);
      window.history.replaceState(null, "", `/s/${sid}`);
      // flush anything typed while lenses were loading
      const queued = queuedRef.current;
      queuedRef.current = [];
      queued.forEach((p) => void postIdea(sid, p.tempId, p.text));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't start the board. Try again.");
      setPrompt(null);
    } finally {
      setFinding(false);
    }
  }

  async function saveAxes(next: { id?: string; poleA: string; poleB: string }[]) {
    const sid = sessionRef.current;
    if (!sid) return;
    setSavingAxes(true);
    try {
      await api.updateAxes(sid, { axes: next });
      lastMutation.current = Date.now();
      applyState(await api.getState(sid));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save that lens.");
    } finally {
      setSavingAxes(false);
    }
  }

  // ---- provocations
  const current = state
    ? [...state.provocations].reverse().find((p) => p.status === "shown" && (!replayFrame || replayFrame.questions.has(p.id))) ?? null
    : null;
  const textOf = useCallback((id: string) => state?.ideas.find((i) => i.id === id)?.text, [state]);
  const note: QuestionNoteData | null = localNote ?? (current ? toNote(current, textOf) : null);

  async function resolveNote(status: "accepted" | "dismissed") {
    setWhyOpen(false);
    if (localNote) {
      setLocalNote(null);
      if (status === "accepted") openDraftAtFreeSpot("");
      return;
    }
    if (!current) return;
    setBusy(true);
    try {
      await api.updateProvocation(current.id, { status });
      lastMutation.current = Date.now();
      setState((prev) =>
        prev ? { ...prev, provocations: prev.provocations.map((p) => (p.id === current.id ? { ...p, status } : p)) } : prev,
      );
      if (status === "accepted") {
        if (current.type === "assumption") setAssumptionOpen(true);
        else openDraftAtFreeSpot("");
      }
    } catch {
      toast("Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShortlist(ideaId: string, next: boolean) {
    setState((prev) => (prev ? { ...prev, ideas: prev.ideas.map((i) => (i.id === ideaId ? { ...i, shortlisted: next } : i)) } : prev));
    lastMutation.current = Date.now();
    try {
      await patchIdea(ideaId, { shortlisted: next });
    } catch {
      setState((prev) => (prev ? { ...prev, ideas: prev.ideas.map((i) => (i.id === ideaId ? { ...i, shortlisted: !next } : i)) } : prev));
      toast("Couldn't save the shortlist. Try again.");
    }
  }

  async function postAssumption(text: string) {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const res = await api.addIdeas(sid, { texts: [text], source: "typed" });
      const created = res.ideas[0];
      if (created) await patchIdea(created.id, { kind: "assumption" });
      lastMutation.current = Date.now();
      applyState(await api.getState(sid));
      setAssumptionOpen(false);
    } catch {
      toast(ERR_ADD);
    }
  }

  const onReplayFrame = useCallback((ideaIds: string[], questionIds: string[]) => {
    setReplayFrame((prev) => {
      const same =
        prev && prev.ideas.size === ideaIds.length && prev.questions.size === questionIds.length && ideaIds.every((id) => prev.ideas.has(id));
      return same ? prev : { ideas: new Set(ideaIds), questions: new Set(questionIds) };
    });
  }, []);

  // ---- drafting
  function openDraftAtFreeSpot(initial: string) {
    if (lens) setLens(false);
    const vp = viewportRef.current;
    const spot = nextFreeSpot(Object.values(positions), usableWidth(vp?.clientWidth ?? 1200), (vp?.scrollTop ?? 0) + 24);
    setDraft({ x: spot.x, y: spot.y, text: initial });
  }

  function onSurfaceClick(e: React.MouseEvent) {
    if (scripted) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (lens) {
      setQuad(null);
      return;
    }
    if (!prompt) {
      document.getElementById("bs-prompt")?.focus();
      toast("Start with your question up top.");
      return;
    }
    if (draft) return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraft({
      x: Math.max(8, e.clientX - rect.left - STICKY_W / 2),
      y: Math.max(8, e.clientY - rect.top - 24),
      text: "",
    });
  }

  // ---- keyboard: L lens, C connections, type-to-add
  useEffect(() => {
    if (scripted) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setWhyOpen(false);
        setQuad(null);
        return;
      }
      if (!prompt) return;
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setLens((v) => !v);
        if (coachStep === 2) setCoachStep(3);
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setShowConn((v) => !v);
        return;
      }
      if (e.key.length === 1 && /\S/.test(e.key) && !draft && !wrapOpen) {
        e.preventDefault();
        openDraftAtFreeSpot(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- human links: the server may answer with a bridge question (never an idea)
  async function askBridge(sid: string, a: string, b: string) {
    try {
      const res = await fetch("/api/provocations/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, a, b }),
      });
      const data = (await res.json()) as { provocation?: Provocation | null };
      if (!res.ok || !data.provocation) return;
      const p = data.provocation;
      lastMutation.current = Date.now();
      setLocalNote(null);
      setWhyOpen(true);
      setState((prev) => (prev && !prev.provocations.some((x) => x.id === p.id) ? { ...prev, provocations: [...prev.provocations, p] } : prev));
    } catch {
      // The link itself is saved locally; a missing question is fine.
    }
  }

  function onLinkStart(from: string, e: React.PointerEvent) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    setLinkDrag({ from, x: e.clientX - rect.left, y: e.clientY - rect.top });
    const move = (ev: PointerEvent) => setLinkDrag({ from, x: ev.clientX - rect.left, y: ev.clientY - rect.top });
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLinkDrag(null);
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 300);
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-sticky-id]")?.getAttribute("data-sticky-id");
      if (!target || target === from || target.startsWith("tmp-") || from.startsWith("tmp-")) return;
      setLinks((list) =>
        list.some((l) => (l.a === from && l.b === target) || (l.a === target && l.b === from)) ? list : [...list, { a: from, b: target }],
      );
      const { edges } = connectionsOf(state);
      const sid = sessionRef.current;
      if (sid) void askBridge(sid, from, target);
      if (!hasEdge(edges, from, target)) {
        const a = textOf(from) ?? "";
        const b = textOf(target) ?? "";
        setLocalNote({
          id: `link-${from}-${target}`,
          text: `You connected “${a}” and “${b}”. What bridges them?`,
          patternName: "Your own connection",
          explanation: "Nothing in the map links these two yet. The bridge is yours to name.",
          refTexts: [a, b],
          local: true,
          ids: [from, target],
        });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---- derived geometry
  const ideas = useMemo(() => state?.ideas ?? [], [state]);
  const xAxis = state?.axes.find((a) => a.id === xId) ?? state?.axes[0];
  const yAxis = state?.axes.find((a) => a.id === yId) ?? state?.axes[1] ?? state?.axes[0];
  const box = plotBox(size.w, size.h, note && size.w >= 1024 ? 390 : 0);
  const lensReady = lens && xAxis && yAxis;
  const { edges, clusters, islands } = connectionsOf(state);
  const islandSet = new Set(islands);

  const occupied = new Set<QuadKey>(lensReady ? ideas.map((i) => quadOf(i, xAxis.id, yAxis.id)) : []);
  const highlightIds: string[] = localNote ? localNote.ids : whyOpen && current ? current.why.ideaIds : digestIds;
  const highlight = new Set(highlightIds);

  const claimed = new Set(Object.values(keyMap));
  type Item = { key: string; id: string; text: string; speaker?: string; authorColor?: string; isPending: boolean; idea?: Idea };
  const allItems: Item[] = [
    ...ideas.map((i) => ({ key: keyMap[i.id] ?? i.id, id: i.id, text: i.text, speaker: (i as AuthoredIdea).authorName ?? i.speaker, authorColor: (i as AuthoredIdea).authorColor, isPending: false, idea: i })),
    ...pending.filter((p) => !claimed.has(p.tempId)).map((p) => ({ key: p.tempId, id: p.tempId, text: p.text, isPending: true })),
  ];

  const items = replayFrame ? allItems.filter((i) => i.isPending || replayFrame.ideas.has(i.id)) : allItems;

  function targetFor(item: Item) {
    if (lensReady && item.idea) {
      const pt = lensPoint(item.idea, xAxis.id, yAxis.id, box);
      const scale = size.w < 640 ? 0.46 : LENS_SCALE;
      const hw = (STICKY_W * scale) / 2;
      const hh = (STICKY_H * scale) / 2;
      const cx = Math.min(box.left + box.width - hw, Math.max(box.left + hw, pt.x));
      const cy = Math.min(box.top + box.height - hh, Math.max(box.top + hh, pt.y));
      return { x: cx - STICKY_W / 2, y: cy - STICKY_H / 2, rotate: 0, scale };
    }
    if (lensReady) {
      return { x: box.left + box.width / 2 - STICKY_W / 2, y: box.top + box.height + 4, rotate: 0, scale: 0.5 };
    }
    const p = positions[item.id] ?? positions[item.key] ?? { x: 24, y: 24, rot: 0 };
    return { x: p.x, y: p.y, rotate: p.rot, scale: 1 };
  }

  const centers: Record<string, { x: number; y: number }> = {};
  for (const item of items) {
    const t = targetFor(item);
    const drag = dragging?.id === item.id ? dragging : null;
    centers[item.id] = { x: t.x + STICKY_W / 2 + (drag?.dx ?? 0), y: t.y + STICKY_H / 2 + (drag?.dy ?? 0) };
  }

  const extentW = Math.max(size.w, ...Object.values(positions).map((p) => p.x + STICKY_W + 48));
  const extentH = Math.max(size.h, ...Object.values(positions).map((p) => p.y + STICKY_H + 120));
  const surfaceW = lens ? size.w : extentW;
  const surfaceH = lens ? size.h : extentH;

  const quadIdeas = lensReady && quad ? ideas.filter((i) => quadOf(i, xAxis.id, yAxis.id) === quad) : [];
  const hasPrompt = Boolean(prompt);
  const nothingYet = hasPrompt && !items.length && !draft;

  return (
    <div className="relative flex h-svh flex-col overflow-hidden">
      {/* ---------- header ---------- */}
      <header className="relative z-20 border-b border-rule/70 bg-paper/85 px-4 pt-3 pb-2 backdrop-blur sm:px-8">
        {loading ? (
          <div className="h-12 w-2/3 animate-pulse rounded bg-paper-sunk" />
        ) : !hasPrompt ? (
          <div className="py-4 sm:py-8">
            <PromptEntry onSubmit={(v) => void startSession(v)} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <motion.h1
                data-tour="question-heading"
                layoutId="bs-prompt-heading"
                className="font-display min-w-0 text-[clamp(1.25rem,1rem+1vw,1.75rem)] leading-tight tracking-tight text-ink sm:truncate"
                title={prompt ?? undefined}
              >
                {prompt}
              </motion.h1>
              <div className="flex shrink-0 items-center gap-1">
                {sessionId && !scripted ? <InviteButton sessionId={sessionId} className="max-sm:hidden" /> : null}
                {!scripted ? <PhoneQrButton sessionId={sessionId} /> : null}
                {!scripted && ideas.length ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-pressed={replayOn}
                      className={`h-8 px-2.5 max-md:hidden ${replayOn ? "bg-paper-sunk text-ink" : ""}`}
                      onClick={() => {
                        setReplayOn((v) => !v);
                        setReplayFrame(null);
                      }}
                    >
                      Replay
                    </Button>
                    <Button type="button" variant="ghost" aria-pressed={convergeOn} className="h-8 px-2.5 max-md:hidden" onClick={() => setConvergeOn(true)}>
                      Converge
                    </Button>
                  </>
                ) : null}
                <Button type="button" variant="outline" className="h-8 px-3" disabled={!ideas.length} onClick={() => setWrapOpen(true)}>
                  Wrap up
                </Button>
                {!scripted ? <AccountMenu className="ml-1" /> : null}
              </div>
            </div>
            <div data-tour="lens-bar" className="min-w-0">
            <LensChips axes={state?.axes ?? []} finding={finding} saving={savingAxes} lens={lens} xId={xAxis?.id ?? null} yId={yAxis?.id ?? null} onSave={(a) => void saveAxes(a)} />
            </div>
          </div>
        )}
      </header>

      {sessionId && !scripted ? (
        <div className="relative z-10 px-4 sm:px-8">
          <AwayDigest
            sessionId={sessionId}
            className="mt-2"
            onHighlight={(ids) => {
              setDigestIds(ids);
              window.setTimeout(() => setDigestIds([]), 6000);
            }}
          />
        </div>
      ) : null}
      {/* ---------- board ---------- */}
      <div
        ref={viewportRef}
        data-tour="board"
        className={`relative flex-1 ${lens ? "overflow-hidden" : "overflow-auto"}`}
        style={{
          backgroundImage: "radial-gradient(circle, color-mix(in oklch, var(--ink) 14%, transparent) 1px, transparent 1.4px)",
          backgroundSize: "22px 22px",
        }}
      >
        <div
          ref={surfaceRef}
          role="application"
          aria-label={lens ? "Lens view of your ideas" : "Whiteboard. Click to add a sticky note."}
          className={`relative ${lens ? "" : hasPrompt ? "cursor-crosshair" : ""}`}
          style={{ width: surfaceW, height: surfaceH }}
          onClick={onSurfaceClick}
        >
          <AnimatePresence>
            {lensReady ? (
              <LensGrid key="grid" box={box} xAxis={xAxis} yAxis={yAxis} occupied={occupied} selected={quad} onSelect={setQuad} />
            ) : null}
          </AnimatePresence>

          <ConnectionsLayer
            width={surfaceW}
            height={surfaceH}
            centers={centers}
            edges={edges}
            clusters={clusters}
            links={links}
            hoverId={hoverId}
            show={showConn}
            pendingLink={linkDrag}
            onRemoveLink={(l) => setLinks((list) => list.filter((x) => !(x.a === l.a && x.b === l.b)))}
          />

          {items.map((item) => (
            <Sticky
              key={item.key}
              id={item.id}
              text={item.text}
              speaker={item.speaker}
              authorColor={item.authorColor}
              color={stickyColor(item.speaker)}
              target={targetFor(item)}
              isPending={item.isPending}
              isFresh={freshRef.current.has(item.key) || Boolean(snapshot?.freshIds.includes(item.id))}
              isHighlighted={highlight.has(item.id)}
              isDimmed={(highlight.size > 0 && !highlight.has(item.id)) || (lensReady && quad !== null && item.idea !== undefined && quadOf(item.idea, xAxis.id, yAxis.id) !== quad)}
              isIsland={islandSet.has(item.id)}
              assumption={item.idea?.kind === "assumption" ? <AssumptionCard idea={item.idea} /> : undefined}
              isShortlisted={Boolean(item.idea?.shortlisted)}
              canDrag={!lens && !scripted}
              compact={Boolean(lensReady)}
              onHover={setHoverId}
              onDrag={(id, dx, dy) => setDragging({ id, dx, dy })}
              onDragEnd={(id, dx, dy) => {
                setDragging(null);
                setPositions((p) => {
                  const cur = p[id];
                  return cur ? { ...p, [id]: { ...cur, x: Math.max(0, cur.x + dx), y: Math.max(0, cur.y + dy) } } : p;
                });
              }}
              onLinkStart={onLinkStart}
            />
          ))}

          {draft ? (
            <DraftSticky
              key={`${draft.x}-${draft.y}`}
              x={draft.x}
              y={draft.y}
              color={stickyColor()}
              initialText={draft.text}
              onCancel={() => setDraft(null)}
              onCommit={(text) => {
                const at = { x: draft.x, y: draft.y };
                setDraft(null);
                addIdea(text, at);
              }}
            />
          ) : null}

          {!hasPrompt && !loading ? (
            <p className="font-display pointer-events-none absolute inset-x-0 top-[30%] px-6 text-center text-xl text-ink-faint italic">
              Your ideas will land here.
            </p>
          ) : null}
          {nothingYet && !lens ? (
            <div className="pointer-events-none absolute inset-x-0 top-[26%] px-6 text-center">
              <p className="font-display text-[clamp(1.25rem,1rem+1vw,1.75rem)] text-ink-soft italic">Click anywhere to stick your first idea.</p>
              <p className="mt-2 text-sm text-ink-faint">Or just start typing. Anything goes — quantity beats polish.</p>
            </div>
          ) : null}
          {lens && !ideas.length ? (
            <p className="font-display pointer-events-none absolute inset-x-0 top-1/2 z-10 px-6 text-center text-lg text-ink-soft italic">
              Add a few notes, then come back. Lens view places them on two of your lenses.
            </p>
          ) : null}
        </div>
      </div>

      {/* ---------- floating chrome ---------- */}
      {hasPrompt ? (
        <div className="pointer-events-none absolute right-4 bottom-4 left-4 z-30 flex items-end justify-between gap-3 sm:right-8 sm:left-8">
          <div className="pointer-events-auto flex flex-col items-start gap-2">
            {lensReady && quad ? (
              <div className="relative w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-rule bg-paper-raised p-3 shadow-[var(--shadow-card)]">
                <p className="text-sm">
                  {quadIdeas.length ? `${quadIdeas.length} note${quadIdeas.length === 1 ? "" : "s"} in this corner.` : "Nobody's been here yet."}
                </p>
                {quadIdeas.length ? <RealityButton ideaTexts={quadIdeas.map((i) => i.text)} prompt={prompt ?? ""} className="mt-2" /> : null}
              </div>
            ) : null}
            {lensReady && state ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-rule bg-paper-raised/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur max-sm:max-w-[11rem] max-sm:flex-col max-sm:items-start">
                <AxisPick label="Across" value={xAxis.id} axes={state.axes} onChange={setXId} />
                <AxisPick label="Up" value={yAxis.id} axes={state.axes} onChange={setYId} />
              </div>
            ) : null}
            {state ? (
              <div data-tour="range-meter">
                <RangeMeter value={state.diversity} />
              </div>
            ) : null}
          </div>
          <div className="pointer-events-auto relative flex flex-col items-end gap-2">
            {scripted ? null : <BoardCoach step={coachStep} onStep={setCoachStep} />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={showConn}
                title="Show connections (C)"
                onClick={() => setShowConn((v) => !v)}
                className="hidden h-10 items-center gap-1.5 rounded-full border border-rule bg-paper-raised/95 px-3 text-xs text-ink-soft shadow-sm transition hover:text-ink sm:flex"
              >
                <svg width="18" height="10" aria-hidden>
                  <path d="M2 8 Q9 0 16 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={showConn ? "0" : "2 2"} />
                </svg>
                Threads
              </button>
              <div data-tour="lens-toggle" role="group" aria-label="View" className="flex rounded-full border border-rule bg-paper-raised/95 p-1 shadow-sm backdrop-blur">
                <ViewTab active={!lens} onClick={() => setLens(false)}>Board</ViewTab>
                <ViewTab
                  active={lens}
                  onClick={() => {
                    setLens(true);
                    if (coachStep === 2) setCoachStep(3);
                  }}
                >
                  <span className="sm:hidden">Lens</span>
                  <span className="max-sm:hidden">Lens view</span> <kbd className="ml-1 hidden rounded border border-current/30 px-1 text-[10px] opacity-60 sm:inline">L</kbd>
                </ViewTab>
              </div>
              {snapshot?.draft ? (
                <div
                  aria-live="polite"
                  className="fixed bottom-24 left-1/2 z-40 w-[min(17rem,calc(100vw-2rem))] -translate-x-1/2 -rotate-1 rounded-[3px] p-3 text-[0.95rem] leading-snug text-ink shadow-[0_18px_30px_-12px_oklch(30%_0.04_60/0.45)] ring-2 ring-ink/80"
                  style={{ background: stickyColor() }}
                >
                  {snapshot.draft}
                  <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" />
                </div>
              ) : null}
              <motion.button
                  data-tour="add-sticky"
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.95 }}
                  transition={spring.snappy}
                  onClick={() => openDraftAtFreeSpot("")}
                  className="flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper-raised shadow-[0_10px_24px_-10px_oklch(22%_0.02_60/0.6)] transition hover:-translate-y-px"
                >
                  <span className="text-lg leading-none">+</span>
                  <span className="max-sm:sr-only">Add a sticky</span>
                </motion.button>
            </div>
          </div>
        </div>
      ) : null}

      {replayOn && state ? (
        <div className="absolute inset-x-0 bottom-[5.5rem] z-30 flex justify-center px-4">
          <div className="w-[min(40rem,100%)] rounded-2xl border border-rule bg-paper-raised/95 p-2 shadow-[var(--shadow-card)] backdrop-blur">
            <ReplayTimeline
              state={state}
              onFrame={onReplayFrame}
            />
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute top-[7.5rem] right-4 z-30 max-sm:top-auto max-sm:bottom-36 sm:right-8">
        <QuestionNote
          note={note}
          whyOpen={whyOpen || Boolean(localNote)}
          busy={busy}
          onWhy={setWhyOpen}
          onAccept={() => void resolveNote("accepted")}
          onDismiss={() => void resolveNote("dismissed")}
        />
      </div>

      <AnimatePresence>
        {wrapOpen && state ? <WrapUp state={state} getBoardElement={() => viewportRef.current} onClose={() => setWrapOpen(false)} /> : null}
        {convergeOn && state ? (
          <ConvergeDrawer key="converge" state={state} onToggleShortlist={(id, next) => void toggleShortlist(id, next)} onClose={() => setConvergeOn(false)} />
        ) : null}
        {assumptionOpen ? <AssumptionWriter key="assume" onSubmit={postAssumption} onClose={() => setAssumptionOpen(false)} /> : null}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {pending.length ? `${pending.length} idea${pending.length === 1 ? "" : "s"} being placed` : ""}
      </span>
    </div>
  );
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-8 items-center rounded-full px-3 text-xs whitespace-nowrap font-medium transition-colors ${active ? "bg-ink text-paper-raised" : "text-ink-soft hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function AxisPick({
  label,
  value,
  axes,
  onChange,
}: {
  label: string;
  value: string;
  axes: SessionState["axes"];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-ink-soft">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9.5rem] overflow-hidden text-ellipsis rounded-md max-sm:max-w-[7.5rem] bg-transparent py-0.5 text-xs font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-signal-ink"
      >
        {axes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.poleA} ↔ {a.poleB}
          </option>
        ))}
      </select>
    </label>
  );
}
