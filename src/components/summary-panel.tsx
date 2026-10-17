"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Provocation, SessionState } from "@/lib/contract";
import { ScatterMap } from "@/components/scatter-map";

export function SummaryPanel({
  state,
  joinUrl,
}: {
  state: SessionState;
  joinUrl: string;
}) {
  const xAxis = state.axes[0];
  const yAxis = state.axes[1] ?? state.axes[0];
  const asked = state.provocations.length;
  const taken = state.provocations.filter((item: Provocation) => item.status === "accepted").length;

  if (!xAxis) return null;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">Session ledger</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">You wrote the ideas</h2>
        <p className="mt-3 text-lg">
          You wrote {state.ideas.length} ideas. AI wrote 0 ideas and asked {asked} questions; you took {taken}.
        </p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-4">
        <ScatterMap
          ideas={state.ideas}
          xAxis={xAxis}
          yAxis={yAxis}
          overview={false}
          highlightIds={[]}
          freshIds={[]}
        />
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <QRCodeSVG value={joinUrl} size={96} />
        <div>
          <p className="font-medium">Invite a phone</p>
          <p className="text-sm text-muted-foreground">Scan to open the join link for this session.</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{joinUrl}</p>
        </div>
      </div>
    </section>
  );
}
