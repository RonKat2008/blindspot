"use client";

import type { SessionState } from "@/lib/contract";

export function AxisPick({
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
        className="max-w-[9.5rem] overflow-hidden rounded-md bg-transparent py-0.5 text-xs font-medium text-ellipsis text-ink outline-none focus-visible:ring-2 focus-visible:ring-signal-ink max-sm:max-w-[7.5rem]"
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
