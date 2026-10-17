"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Provocation, SessionState } from "@/lib/contract";
import { patchIdea } from "./extras";
import { addMediaIdea, deleteIdea, type MediaType } from "./media";

export type PendingMedia = { mediaType: MediaType; mediaUrl: string; caption: string } | null;
export type Pending = { tempId: string; text: string; media?: PendingMedia };

const POLL_MS = 5000;
const ERR_ADD = "Couldn't reach the map. Your idea is safe — try again.";

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

/** Everything that talks to the API for one board: load, poll, create, add, edit. */
export function useBoardSession(initialId: string | undefined, enabled: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(initialId ?? null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(Boolean(initialId) && enabled);
  const [finding, setFinding] = useState(false);
  const [savingAxes, setSavingAxes] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [keyMap, setKeyMap] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const lastMutation = useRef(0);
  const sessionRef = useRef<string | null>(initialId ?? null);
  const queuedRef = useRef<Pending[]>([]);

  const touch = () => {
    lastMutation.current = Date.now();
  };

  const applyState = useCallback((next: SessionState) => {
    setState(next);
    setPrompt(next.session.prompt);
  }, []);

  useEffect(() => {
    if (!initialId || !enabled) return;
    let cancelled = false;
    api
      .getState(initialId)
      .then((next) => !cancelled && applyState(next))
      .catch((err: unknown) => {
        if (!cancelled) toast(err instanceof Error ? err.message : "Couldn't open this board.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [initialId, enabled, applyState]);

  // poll so phone and teammate contributions show up
  useEffect(() => {
    if (!sessionId || !enabled) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const started = Date.now();
      api
        .getState(sessionId)
        .then((next) => lastMutation.current <= started && applyState(next))
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [sessionId, enabled, applyState]);

  const postIdea = useCallback(async (sid: string, item: Pending) => {
    try {
      const res = item.media
        ? await addMediaIdea(sid, { text: item.text, ...item.media })
        : await api.addIdeas(sid, { texts: [item.text], source: "typed" });
      touch();
      const landed = res.ideas[0];
      if (landed) setKeyMap((m) => ({ ...m, [landed.id]: item.tempId }));
      setPending((list) => list.filter((x) => x.tempId !== item.tempId));
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
      // the graph (edges/clusters) is computed on read; refresh it
      api.getState(sid).then(applyState).catch(() => undefined);
    } catch {
      setPending((list) => list.filter((x) => x.tempId !== item.tempId));
      toast(ERR_ADD);
    }
  }, [applyState]);

  const addIdea = useCallback(
    (text: string, media?: PendingMedia) => {
      const item: Pending = { tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, media };
      setPending((list) => [...list, item]);
      const sid = sessionRef.current;
      if (sid) void postIdea(sid, item);
      else queuedRef.current.push(item);
    },
    [postIdea],
  );

  async function startSession(value: string) {
    setPrompt(value);
    setFinding(true);
    try {
      const { sessionId: sid, axes } = await api.createSession({ prompt: value });
      sessionRef.current = sid;
      setSessionId(sid);
      setState(emptyState(sid, value, axes));
      window.history.replaceState(null, "", `/s/${sid}`);
      const queued = queuedRef.current;
      queuedRef.current = [];
      queued.forEach((p) => void postIdea(sid, p));
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
      touch();
      applyState(await api.getState(sid));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save that lens.");
    } finally {
      setSavingAxes(false);
    }
  }

  async function setProvocation(p: Provocation, status: "accepted" | "dismissed"): Promise<boolean> {
    setBusy(true);
    try {
      await api.updateProvocation(p.id, { status });
      touch();
      setState((prev) => (prev ? { ...prev, provocations: prev.provocations.map((x) => (x.id === p.id ? { ...x, status } : x)) } : prev));
      return true;
    } catch {
      toast("Couldn't save that. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function addProvocation(p: Provocation) {
    touch();
    setState((prev) => (prev && !prev.provocations.some((x) => x.id === p.id) ? { ...prev, provocations: [...prev.provocations, p] } : prev));
  }

  function patchLocal(id: string, patch: Partial<SessionState["ideas"][number]>) {
    setState((prev) => (prev ? { ...prev, ideas: prev.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : prev));
  }

  async function updateIdea(id: string, patch: { shortlisted?: boolean; kind?: "idea" | "assumption"; board?: { x: number; y: number } }) {
    const before = state?.ideas.find((i) => i.id === id);
    patchLocal(id, patch);
    touch();
    try {
      await patchIdea(id, patch);
    } catch {
      if (before) patchLocal(id, before);
      toast("Couldn't save that. Try again.");
    }
  }

  async function removeIdea(id: string) {
    setHidden((h) => [...h, id]);
    try {
      await deleteIdea(id);
      touch();
    } catch {
      toast("Hidden on this screen. Deleting for everyone isn't available yet.");
    }
  }

  async function postAssumption(text: string) {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const res = await api.addIdeas(sid, { texts: [text], source: "typed" });
      const created = res.ideas[0];
      if (created) await patchIdea(created.id, { kind: "assumption" });
      touch();
      applyState(await api.getState(sid));
    } catch {
      toast(ERR_ADD);
    }
  }

  return {
    sessionId,
    sessionRef,
    prompt,
    state,
    loading,
    finding,
    savingAxes,
    pending,
    keyMap,
    hidden,
    busy,
    startSession,
    addIdea,
    saveAxes,
    setProvocation,
    addProvocation,
    updateIdea,
    removeIdea,
    postAssumption,
  };
}
