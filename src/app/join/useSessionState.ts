"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { SessionState } from "@/lib/contract";

/** Polls GET /state on an interval. Keeps the last good state if a poll fails. */
export function useSessionState(sessionId: string, intervalMs: number) {
  const [state, setState] = useState<SessionState | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await api.getState(sessionId);
        if (cancelled) return;
        setState(next);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, intervalMs]);

  return { state, failed };
}
