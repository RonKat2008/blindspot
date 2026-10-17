"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { Axis, Idea, SessionState } from "@/lib/contract";
import { IDEA_TEXT_MAX } from "@/lib/contract";
import { AxisReview } from "@/components/axis-review";
import { Coachmark } from "@/components/coachmark";
import { DiversityMeter, ProvocationCard } from "@/components/provocation-card";
import { quadrantKey, ScatterMap } from "@/components/scatter-map";
import { SummaryPanel } from "@/components/summary-panel";

export function SessionScreen({ id, review }: { id: string; review: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [xId, setXId] = useState<string | null>(null);
  const [yId, setYId] = useState<string | null>(null);
  const [overview, setOverview] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [summary, setSummary] = useState(false);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .getState(id)
      .then((next) => {
        if (cancelled) return;
        setState(next);
        setXId(next.axes[0]?.id ?? null);
        setYId(next.axes[1]?.id ?? next.axes[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this session.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="grid min-h-svh place-items-center px-6 text-muted-foreground">
        Opening your map…
      </main>
    );
  }

  if (error || !state) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 px-6">
        <p>{error ?? "This session is missing."}</p>
        <Button type="button" onClick={() => router.push("/")}>
          Start over
        </Button>
      </main>
    );
  }

  const xAxis = state.axes.find((axis) => axis.id === xId) ?? state.axes[0];
  const yAxis = state.axes.find((axis) => axis.id === yId) ?? state.axes[1] ?? state.axes[0];
  const current = [...state.provocations].reverse().find((item) => item.status === "shown");
  const joinUrl = typeof window === "undefined" ? `/join/${id}` : `${window.location.origin}/join/${id}`;

  async function saveAxes(axes: { id?: string; poleA: string; poleB: string }[]) {
    setBusy(true);
    try {
      const { axes: next } = await api.updateAxes(id, { axes });
      setState((prev) => (prev ? { ...prev, axes: next } : prev));
      setXId(next[0]?.id ?? null);
      setYId(next[1]?.id ?? next[0]?.id ?? null);
      router.replace(`/s/${id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save lenses.");
    } finally {
      setBusy(false);
    }
  }

  async function addIdea() {
    const value = text.trim();
    if (!value || !state || !xAxis || !yAxis) return;
    const before = new Set(
      state.ideas.map((idea) =>
        quadrantKey(idea.axisScores[xAxis.id] ?? 0, idea.axisScores[yAxis.id] ?? 0),
      ),
    );
    setBusy(true);
    try {
      const res = await api.addIdeas(id, { texts: [value], source: "typed" });
      const landed = res.ideas[0];
      const region = landed
        ? quadrantKey(landed.axisScores[xAxis.id] ?? 0, landed.axisScores[yAxis.id] ?? 0)
        : null;
      setState((prev) =>
        prev
          ? {
              ...prev,
              ideas: res.allIdeas,
              diversity: res.diversity,
              diversityBreakdown: res.diversityBreakdown,
              provocations: res.provocation ? [...prev.provocations, res.provocation] : prev.provocations,
            }
          : prev,
      );
      setFreshIds(res.ideas.map((idea: Idea) => idea.id));
      setRevealId(region && region !== "center" && !before.has(region) ? landed?.id ?? null : null);
      setText("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add that idea.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "accepted" | "dismissed") {
    if (!current) return;
    setBusy(true);
    try {
      await api.updateProvocation(current.id, { status });
      setState((prev) =>
        prev
          ? {
              ...prev,
              provocations: prev.provocations.map((item) =>
                item.id === current.id ? { ...item, status } : item,
              ),
            }
          : prev,
      );
      setWhyOpen(false);
      if (status === "accepted") {
        document.getElementById("idea-input")?.focus();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update that question.");
    } finally {
      setBusy(false);
    }
  }

  if (review) {
    return (
      <AxisReview prompt={state.session.prompt} axes={state.axes} busy={busy} onStart={(axes) => void saveAxes(axes)} />
    );
  }

  if (summary) {
    return (
      <div>
        <div className="flex justify-end px-4 pt-4">
          <Button type="button" variant="outline" onClick={() => setSummary(false)}>
            Back to the map
          </Button>
        </div>
        <SummaryPanel state={state} joinUrl={joinUrl} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-3 pb-28 sm:px-5">
      <header className="flex flex-wrap items-end justify-between gap-3 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Blind Spot</p>
          <h1 className="truncate text-lg font-semibold">{state.session.prompt}</h1>
        </div>
        <DiversityMeter value={state.diversity} />
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AxisSelect label="Horizontal lens" axes={state.axes} value={xAxis?.id ?? ""} onChange={setXId} disabled={overview} />
        <AxisSelect label="Vertical lens" axes={state.axes} value={yAxis?.id ?? ""} onChange={setYId} disabled={overview} />
        <Button type="button" variant={overview ? "default" : "outline"} onClick={() => setOverview((v) => !v)}>
          {overview ? "Overview on" : "Overview"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setQrOpen((v) => !v)}>
          Invite
        </Button>
        <Button type="button" variant="ghost" className="ml-auto" onClick={() => setSummary(true)}>
          Ledger
        </Button>
      </div>

      {qrOpen ? (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <QRCodeSVG value={joinUrl} size={88} />
          <p className="text-sm text-muted-foreground">Anyone with this code can join at {joinUrl}</p>
        </div>
      ) : null}

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-3xl border border-border bg-card p-3 sm:p-5">
          {xAxis && yAxis ? (
            <ScatterMap
              ideas={state.ideas}
              xAxis={xAxis}
              yAxis={yAxis}
              overview={overview}
              highlightIds={whyOpen && current ? current.why.ideaIds : []}
              revealId={revealId}
              freshIds={freshIds}
            />
          ) : null}
          {state.ideas.length === 0 ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Add your first idea — anything goes.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          {current ? (
            <ProvocationCard
              provocation={current}
              whyOpen={whyOpen}
              onWhy={setWhyOpen}
              busy={busy}
              onAccept={() => void setStatus("accepted")}
              onDismiss={() => void setStatus("dismissed")}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Keep adding ideas. A question shows up when the map notices a pattern — still no suggestions.
            </p>
          )}
        </div>
      </div>

      <form
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-5"
        onSubmit={(event) => {
          event.preventDefault();
          void addIdea();
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl gap-2">
          <Input
            id="idea-input"
            value={text}
            maxLength={IDEA_TEXT_MAX}
            placeholder="Add an idea and press Enter"
            className="h-12 bg-card text-base"
            onChange={(event) => setText(event.target.value)}
            disabled={busy}
          />
          <Button type="submit" className="h-12 px-4" disabled={busy || !text.trim()}>
            Add
          </Button>
        </div>
      </form>
      <Coachmark />
    </div>
  );
}

function AxisSelect({
  label,
  axes,
  value,
  onChange,
  disabled,
}: {
  label: string;
  axes: Axis[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const axis = axes.find((item) => item.id === value);
  return (
    <label className="text-xs text-muted-foreground" title={axis ? `${axis.poleA} ↔ ${axis.poleB}. Left/bottom is the first word.` : undefined}>
      {label}
      <select
        className="mt-1 block h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {axes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.poleA} ↔ {item.poleB}
          </option>
        ))}
      </select>
    </label>
  );
}
