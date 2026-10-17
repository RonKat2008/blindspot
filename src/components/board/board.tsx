"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { AwayDigest } from "@/components/account/away-digest";
import { RealityButton } from "@/components/reality-button";
import { ReplayTimeline } from "@/components/replay/replay-timeline";
import type { Provocation, SessionState } from "@/lib/contract";
import type { AuthoredIdea } from "@/lib/supabase/account-types";
import { PromptEntry } from "./board-header";
import type { HumanLink, QuadKey } from "./board-utils";
import { connectionsOf, hasEdge, plotBox, quadOf, stickyColor, store } from "./board-utils";
import { BoardCoach, QuestionNote, type QuestionNoteData, RangeMeter, toNote } from "./chrome";
import { AssumptionWriter, ConvergeDrawer } from "./extras";
import { Inspector } from "./inspector";
import type { MediaIdea, MediaType } from "./media";
import { MediaComposer, type MediaDraft, type PlacedMedia, useRecorder } from "./media-composer";
import { ThoughtInput } from "./thought-input";
import type { ContextResult } from "./context-panel";
import { ContextDrawer } from "./extras";
import { type MapItem, ThoughtMap } from "./thought-map";
import { AxisPick } from "./toolbar";
import { TopBar } from "./top-bar";
import { useBoardSession } from "./use-board-session";
import { WrapUp } from "./wrap-up";

export type BoardSnapshot = {
  state: SessionState;
  draft: string;
  view: "board" | "lens";
  whyOpen: boolean;
  freshIds: string[];
  revealId: string | null;
  /** Optional (tour): open the inspector on this idea. */
  selectedId?: string | null;
  /** Optional (tour): show the converge drawer. */
  converge?: boolean;
  /** Optional (tour): show the replay timeline. */
  replay?: boolean;
};

type LocalNote = QuestionNoteData & { ids: string[] };

function isTyping(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || Boolean((el as HTMLElement | null)?.isContentEditable);
}

/**
 * The thought map. Live mode: pass `sessionId` (or nothing for a fresh board).
 * Scripted mode: pass `snapshot` (the /demo tour) — no network, no input, deterministic layout.
 */
export function Board({ sessionId: initialId, snapshot, sandbox = false }: { sessionId?: string; snapshot?: BoardSnapshot; sandbox?: boolean }) {
  const scripted = Boolean(snapshot);
  const live = useBoardSession(initialId, !scripted);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRecorder();

  const [lensRaw, setLens] = useState(false);
  const [xId, setXId] = useState<string | null>(null);
  const [yId, setYId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [whyRaw, setWhyOpen] = useState(false);
  const [localNote, setLocalNote] = useState<LocalNote | null>(null);
  const [links, setLinks] = useState<HumanLink[]>(() => (initialId && typeof window !== "undefined" ? store.links(initialId) : []));
  const [showConn, setShowConn] = useState(true);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [quad, setQuad] = useState<QuadKey | null>(null);
  const [coachStep, setCoachStep] = useState(initialId ? 1 : 0);
  const [wrapOpen, setWrapOpen] = useState(false);
  const [digestIds, setDigestIds] = useState<string[]>([]);
  const [replayRaw, setReplayOn] = useState(false);
  const [replayFrame, setReplayFrame] = useState<{ ideas: Set<string>; questions: Set<string> } | null>(null);
  const [convergeRaw, setConvergeOn] = useState(false);
  const [assumptionOpen, setAssumptionOpen] = useState(false);
  const [selectedRaw, setSelectedId] = useState<string | null>(null);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [inspectHover, setInspectHover] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [mediaDraft, setMediaDraft] = useState<MediaDraft | null>(null);
  const [contextQuery, setContextQuery] = useState<string | null>(null);
  const [sandboxBanner, setSandboxBanner] = useState(sandbox);

  const state = snapshot ? snapshot.state : live.state;
  const prompt = snapshot ? snapshot.state.session.prompt : live.prompt;
  const lens = snapshot ? snapshot.view === "lens" : lensRaw;
  const whyOpen = snapshot ? snapshot.whyOpen : whyRaw;
  const selectedId = snapshot ? snapshot.selectedId ?? null : selectedRaw;
  const convergeOn = snapshot ? Boolean(snapshot.converge) : convergeRaw;
  const replayOn = snapshot ? Boolean(snapshot.replay) : replayRaw;
  const sessionId = live.sessionId;
  const hasPrompt = Boolean(prompt);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (sessionId) store.saveLinks(sessionId, links);
  }, [sessionId, links]);

  // ---- derived
  const axes = state?.axes ?? [];
  const xAxis = axes.find((a) => a.id === xId) ?? axes[0];
  const yAxis = axes.find((a) => a.id === yId) ?? axes[1] ?? axes[0];
  const ideas = state?.ideas ?? [];
  const textOf = useCallback((id: string) => state?.ideas.find((i) => i.id === id)?.text, [state]);
  const current = state
    ? [...state.provocations].reverse().find((p) => p.status === "shown" && (!replayFrame || replayFrame.questions.has(p.id))) ?? null
    : null;
  const note: QuestionNoteData | null = localNote ?? (current ? toNote(current, textOf) : null);
  const { edges, clusters, islands } = connectionsOf(state);
  const lensReady = lens && xAxis && yAxis ? { xAxis, yAxis } : null;
  const box = plotBox(size.w, size.h, note && size.w >= 1024 ? 390 : 0, note && size.w < 640 ? 160 : 0);

  const hiddenSet = new Set(live.hidden);
  const claimed = new Set(Object.values(live.keyMap));
  const freshIds = new Set(snapshot?.freshIds ?? []);
  const allItems: MapItem[] = [
    ...ideas
      .filter((i) => !hiddenSet.has(i.id))
      .map((i) => {
        const m = i as Omit<AuthoredIdea, "mediaType"> & MediaIdea;
        const key = live.keyMap[i.id] ?? i.id;
        return {
          key,
          id: i.id,
          text: i.text,
          color: m.authorColor ?? (i.speaker ? stickyInk(i.speaker) : "var(--ink)"),
          idea: i,
          media: m.mediaType ? { type: m.mediaType, url: m.mediaUrl } : undefined,
          isPending: false,
          isFresh: freshIds.has(i.id) || key !== i.id,
        };
      }),
    ...(scripted
      ? []
      : live.pending
          .filter((p) => !claimed.has(p.tempId))
          .map((p) => ({
            key: p.tempId,
            id: p.tempId,
            text: p.text,
            color: "var(--ink-soft)",
            media: p.media ? { type: p.media.mediaType, url: p.media.mediaUrl } : undefined,
            isPending: true,
            isFresh: true,
          }))),
  ];
  const items = replayFrame ? allItems.filter((i) => i.isPending || replayFrame.ideas.has(i.id)) : allItems;

  const highlightIds: string[] = selectedId
    ? [selectedId, ...relatedIds]
    : localNote
      ? localNote.ids
      : whyOpen && current
        ? current.why.ideaIds
        : digestIds;
  const occupied = new Set<QuadKey>(lensReady ? ideas.map((i) => quadOf(i, lensReady.xAxis.id, lensReady.yAxis.id)) : []);
  const quadIdeas = lensReady && quad ? ideas.filter((i) => quadOf(i, lensReady.xAxis.id, lensReady.yAxis.id) === quad) : [];

  // ---- linking points (select, then shift+click or "Connect to…")
  async function askBridge(sid: string, a: string, b: string) {
    try {
      const res = await fetch("/api/provocations/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, a, b }),
      });
      const data = (await res.json()) as { provocation?: Provocation | null };
      if (!res.ok || !data.provocation) return;
      setLocalNote(null);
      setWhyOpen(true);
      live.addProvocation(data.provocation);
    } catch {
      // the link is saved locally; a missing question is fine
    }
  }

  function connect(a: string, b: string) {
    if (a === b || a.startsWith("tmp-") || b.startsWith("tmp-")) return;
    setLinks((list) => (list.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)) ? list : [...list, { a, b }]));
    setConnectFrom(null);
    toast("Connected.");
    if (!hasEdge(edges, a, b)) {
      const ta = textOf(a) ?? "";
      const tb = textOf(b) ?? "";
      setLocalNote({
        id: `link-${a}-${b}`,
        text: `You connected “${ta}” and “${tb}”. What bridges them?`,
        patternName: "Your own connection",
        explanation: "Nothing in the map links these two yet. The bridge is yours to name.",
        refTexts: [ta, tb],
        local: true,
        ids: [a, b],
      });
    }
    if (sessionId) void askBridge(sessionId, a, b);
  }

  function onSelect(id: string, additive: boolean) {
    if (connectFrom) return connect(connectFrom, id);
    if (additive && selectedId && selectedId !== id) return connect(selectedId, id);
    setSelectedId(id);
  }

  // ---- questions
  async function resolveNote(status: "accepted" | "dismissed") {
    setWhyOpen(false);
    if (localNote) {
      setLocalNote(null);
      if (status === "accepted") document.getElementById("bs-thought")?.focus();
      return;
    }
    if (!current) return;
    const ok = await live.setProvocation(current, status);
    if (!ok || status !== "accepted") return;
    if (current.type === "assumption") setAssumptionOpen(true);
    else document.getElementById("bs-thought")?.focus();
  }

  // ---- media points
  function openMedia(blob: Blob, name: string, mediaType: MediaType) {
    if (!prompt || scripted) return;
    if (!live.sessionRef.current) {
      toast("One moment — the board is still being set up.");
      return;
    }
    setMediaDraft({ blob, name, mediaType });
  }
  async function startRecording() {
    if (!prompt) return;
    if (!(await recorder.start())) toast("Couldn't reach a microphone. Check the browser permission.");
  }
  async function stopRecording() {
    const blob = await recorder.stop();
    if (blob) openMedia(blob, "voice-note.webm", "audio");
  }
  function placeMedia(placed: PlacedMedia) {
    setMediaDraft(null);
    live.addIdea(placed.label, placed.media);
  }

  function pinSource(r: ContextResult) {
    live.addIdea(r.title, { mediaType: "link", mediaUrl: r.url, caption: `${r.title} — ${r.snippet}` });
    toast("Pinned to the board as a source.");
  }

  function addThought(text: string) {
    live.addIdea(text);
    if (coachStep === 1) setCoachStep(2);
  }

  const onReplayFrame = useCallback((ideaIds: string[], questionIds: string[]) => {
    setReplayFrame((prev) => {
      const same = prev && prev.ideas.size === ideaIds.length && prev.questions.size === questionIds.length && ideaIds.every((id) => prev.ideas.has(id));
      return same ? prev : { ideas: new Set(ideaIds), questions: new Set(questionIds) };
    });
  }, []);

  function toggleLens(next: boolean) {
    setLens(next);
    if (next && coachStep === 2) setCoachStep(3);
  }

  // ---- keyboard + paste
  useEffect(() => {
    if (scripted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConnectFrom(null);
        setWhyOpen(false);
        setQuad(null);
        return;
      }
      if (isTyping() || e.metaKey || e.ctrlKey || e.altKey || !prompt) return;
      const k = e.key.toLowerCase();
      if (k === "l") toggleLens(!lens);
      else if (k === "c") setShowConn((v) => !v);
      else if (k === "i") fileRef.current?.click();
      else if (k === "r" && !e.repeat) void (recorder.recording ? stopRecording() : startRecording());
      else if (k === "/" || k === "t") document.getElementById("bs-thought")?.focus();
      else return;
      e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping()) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      openMedia(file, file.name || "pasted.png", "image");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  });

  const menu = [
    { label: "Show connections", hint: "C", checked: showConn, onSelect: () => setShowConn((v) => !v) },
    { label: "Converge", disabled: !ideas.length || scripted, onSelect: () => setConvergeOn(true) },
    {
      label: "Replay",
      checked: replayOn,
      disabled: !ideas.length || scripted,
      onSelect: () => {
        setReplayOn((v) => !v);
        setReplayFrame(null);
      },
    },
    { label: "Wrap up", disabled: !ideas.length, onSelect: () => setWrapOpen(true) },
  ];

  return (
    <div className="relative flex h-svh flex-col overflow-hidden">
      <header className="relative z-20 border-b border-rule/60 bg-paper/85 px-4 pt-3 pb-2 backdrop-blur sm:px-8">
        {live.loading ? (
          <div className="h-12 w-2/3 animate-pulse rounded bg-paper-sunk" />
        ) : !hasPrompt ? (
          <div className="py-4 sm:py-8">
            <PromptEntry onSubmit={(v) => void live.startSession(v)} />
          </div>
        ) : (
          <TopBar
            prompt={prompt ?? ""}
            sessionId={sessionId}
            scripted={scripted}
            axes={axes}
            finding={live.finding}
            savingAxes={live.savingAxes}
            lens={lens}
            xId={xAxis?.id ?? null}
            yId={yAxis?.id ?? null}
            menu={menu}
            onLens={toggleLens}
            onSaveAxes={(a) => void live.saveAxes(a)}
          />
        )}
      </header>

      {sandboxBanner && !scripted ? (
        <div role="status" className="relative z-10 flex items-center justify-between gap-3 border-b border-signal/40 bg-signal-wash px-4 py-2 text-sm text-ink sm:px-8">
          <span>
            <strong className="font-semibold">Sandbox board</strong> — real data, yours to play with. Try adding a thought, an image, or flip to Lens view.
          </span>
          <button type="button" aria-label="Dismiss" className="shrink-0 rounded-full px-2 text-ink-soft hover:text-ink" onClick={() => setSandboxBanner(false)}>
            ✕
          </button>
        </div>
      ) : null}
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

      <div
        ref={viewportRef}
        data-tour="board"
        role="application"
        aria-label={lens ? "Lens view of your ideas" : "Thought map"}
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundImage: "radial-gradient(circle, color-mix(in oklch, var(--ink) 9%, transparent) 1px, transparent 1.4px)",
          backgroundSize: "26px 26px",
        }}
        onClick={() => {
          setSelectedId(null);
          setQuad(null);
        }}
        onDragOver={(e) => {
          if (!scripted && e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/") || f.type.startsWith("audio/"));
          if (!file) return;
          e.preventDefault();
          openMedia(file, file.name, file.type.startsWith("audio/") ? "audio" : "image");
        }}
      >
        <ThoughtMap
          items={items}
          edges={edges}
          clusters={clusters}
          links={links}
          islands={new Set(islands)}
          size={size}
          lens={lensReady ? { box, ...lensReady, occupied, quad, onQuad: setQuad } : null}
          noteOpen={Boolean(note)}
          showConn={showConn}
          highlight={new Set(highlightIds)}
          selectedId={selectedId}
          hoverId={inspectHover ?? hoverId}
          canDrag={!scripted}
          onHover={setHoverId}
          onSelect={onSelect}
          onPin={(id, board) => void live.updateIdea(id, { board })}
          onRemoveLink={(l) => setLinks((list) => list.filter((x) => !(x.a === l.a && x.b === l.b)))}
        />

        {!hasPrompt && !live.loading ? (
          <p className="font-display pointer-events-none absolute inset-x-0 top-[32%] px-6 text-center text-xl text-ink-faint italic">
            Your thoughts will appear here as points, and the map will show how they connect.
          </p>
        ) : null}
        {hasPrompt && !items.length && !lens ? (
          <div className="pointer-events-none absolute inset-x-0 top-[30%] px-6 text-center">
            <p className="font-display text-[clamp(1.25rem,1rem+1vw,1.75rem)] text-ink-soft italic">Add your first thought below.</p>
            <p className="mt-2 text-sm text-ink-faint">Each one becomes a point. Related points draw together on their own.</p>
          </div>
        ) : null}
        {lens && !ideas.length ? (
          <p className="font-display pointer-events-none absolute inset-x-0 top-1/2 z-10 px-6 text-center text-lg text-ink-soft italic">
            Add a few thoughts, then come back. Lens view places them on two of your lenses.
          </p>
        ) : null}
        {connectFrom ? (
          <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink px-4 py-1.5 text-sm text-paper-raised shadow">
            Pick a point to connect to · Esc to cancel
          </div>
        ) : null}
      </div>

      {hasPrompt ? (
        <>
          <div className="pointer-events-none absolute bottom-24 left-4 z-30 flex flex-col items-start gap-2 sm:bottom-5 sm:left-8">
            {lensReady && quad ? (
              <div className="pointer-events-auto relative w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-rule bg-paper-raised p-3 shadow-[var(--shadow-card)]">
                <p className="text-sm">{quadIdeas.length ? `${quadIdeas.length} point${quadIdeas.length === 1 ? "" : "s"} in this corner.` : "Nobody's been here yet."}</p>
                {quadIdeas.length ? <RealityButton ideaTexts={quadIdeas.map((i) => i.text)} prompt={prompt ?? ""} className="mt-2" /> : null}
              </div>
            ) : null}
            {lensReady && state ? (
              <div className="pointer-events-auto flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-rule bg-paper-raised/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur max-sm:hidden">
                <AxisPick label="Across" value={lensReady.xAxis.id} axes={axes} onChange={setXId} />
                <AxisPick label="Up" value={lensReady.yAxis.id} axes={axes} onChange={setYId} />
              </div>
            ) : null}
            {state ? (
              <div data-tour="range-meter" className="pointer-events-auto max-sm:hidden">
                <RangeMeter value={state.diversity} />
              </div>
            ) : null}
          </div>

          {scripted ? null : (
            <div className="pointer-events-none absolute right-4 bottom-24 z-30 sm:right-8">
              <div className="pointer-events-auto">
                <BoardCoach step={coachStep} onStep={setCoachStep} />
              </div>
            </div>
          )}

          {replayOn && state ? (
            <div className="absolute inset-x-0 bottom-24 z-30 flex justify-center px-4">
              <div className="w-[min(40rem,100%)] rounded-2xl border border-rule bg-paper-raised/95 p-2 shadow-[var(--shadow-card)] backdrop-blur">
                <ReplayTimeline state={state} onFrame={onReplayFrame} />
              </div>
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
            <ThoughtInput
              disabled={!scripted && !hasPrompt}
              scriptedValue={snapshot ? snapshot.draft : undefined}
              recording={recorder.recording}
              onAdd={addThought}
              onImage={() => fileRef.current?.click()}
              onRecordStart={() => void startRecording()}
              onRecordStop={() => void stopRecording()}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) openMedia(file, file.name, "image");
            }}
          />
        </>
      ) : null}

      <div className="pointer-events-none absolute top-[7.5rem] right-4 z-30 max-sm:top-auto max-sm:right-3 max-sm:bottom-[5.25rem] sm:right-8">
        <QuestionNote
          note={note}
          whyOpen={whyOpen || Boolean(localNote)}
          busy={live.busy}
          onWhy={setWhyOpen}
          onAccept={() => void resolveNote("accepted")}
          onDismiss={() => void resolveNote("dismissed")}
          onLookInto={sessionId && !scripted && note ? () => setContextQuery(note.text) : undefined}
        />
      </div>

      <AnimatePresence>
        {wrapOpen && state ? <WrapUp key="wrap" state={state} getBoardElement={() => viewportRef.current} onClose={() => setWrapOpen(false)} /> : null}
        {convergeOn && state ? (
          <ConvergeDrawer key="converge" state={state} onToggleShortlist={(id, next) => void live.updateIdea(id, { shortlisted: next })} onClose={() => setConvergeOn(false)} />
        ) : null}
        {selectedId && state && (!scripted || snapshot?.selectedId) && !connectFrom ? (
          <Inspector
            key="inspector"
            ideaId={selectedId}
            state={state}
            onClose={() => {
              setSelectedId(null);
              setRelatedIds([]);
              setInspectHover(null);
            }}
            onJump={setSelectedId}
            onHoverRelated={setInspectHover}
            onRelated={setRelatedIds}
            onConnect={(id) => setConnectFrom(id)}
            sessionId={sessionId}
            onPin={pinSource}
            onShortlist={(id, next) => void live.updateIdea(id, { shortlisted: next })}
            onAssumption={(id) => void live.updateIdea(id, { kind: "assumption" })}
            onDelete={(id) => {
              setSelectedId(null);
              void live.removeIdea(id);
            }}
          />
        ) : null}
        {contextQuery && sessionId ? (
          <ContextDrawer key="context" sessionId={sessionId} query={contextQuery} onPin={pinSource} onClose={() => setContextQuery(null)} />
        ) : null}
        {mediaDraft && sessionId ? (
          <MediaComposer key="media" draft={mediaDraft} sessionId={sessionId} onPlace={placeMedia} onClose={() => setMediaDraft(null)} />
        ) : null}
        {assumptionOpen ? (
          <AssumptionWriter
            key="assume"
            onSubmit={async (text) => {
              await live.postAssumption(text);
              setAssumptionOpen(false);
            }}
            onClose={() => setAssumptionOpen(false)}
          />
        ) : null}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {live.pending.length ? `${live.pending.length} thought${live.pending.length === 1 ? "" : "s"} being placed` : ""}
      </span>
    </div>
  );
}

/** Author dots: a darker pencil tone derived from the speaker's sticky colour family. */
function stickyInk(speaker: string): string {
  return stickyColor(speaker).replace(/oklch\((\d+)%\s+([\d.]+)/, (_m, _l, c) => `oklch(55% ${Math.min(0.16, Number(c) * 2)}`);
}
