"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The one primary action on the map: type a thought, press Enter.
 * Image and voice live inside the same bar as small secondary buttons.
 */
export function ThoughtInput({
  disabled,
  scriptedValue,
  recording,
  onAdd,
  onImage,
  onRecordStart,
  onRecordStop,
}: {
  disabled?: boolean;
  /** /demo: shows the scripted "typing" and is read-only. */
  scriptedValue?: string;
  recording: boolean;
  onAdd: (text: string) => void;
  onImage: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
}) {
  const [value, setValue] = useState("");
  const scripted = scriptedValue !== undefined;

  function submit() {
    const text = value.trim();
    if (!text) return;
    onAdd(text);
    setValue("");
  }

  return (
    <form
      data-tour="add-sticky"
      className="flex w-[min(40rem,calc(100vw-1.5rem))] items-center gap-1 rounded-2xl border border-rule bg-paper-raised/95 p-1.5 pl-4 shadow-[0_16px_40px_-18px_oklch(30%_0.04_60/0.5)] backdrop-blur focus-within:border-ink/40"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="bs-thought" className="sr-only">
        Add a thought
      </label>
      <input
        id="bs-thought"
        autoComplete="off"
        maxLength={280}
        disabled={disabled}
        readOnly={scripted}
        value={scripted ? scriptedValue : value}
        placeholder={recording ? "Listening… release to stop" : "Add a thought…"}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
      />
      {!scripted ? (
        <>
          <IconButton label="Add an image (I)" onClick={onImage} disabled={disabled}>
            <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2" y="3" width="12" height="10" rx="1.5" />
              <circle cx="6" cy="6.5" r="1.2" />
              <path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3" />
            </svg>
          </IconButton>
          <IconButton
            label={recording ? "Release to stop recording" : "Hold to record a voice note (R)"}
            active={recording}
            disabled={disabled}
            onPointerDown={onRecordStart}
            onPointerUp={onRecordStop}
            onPointerLeave={recording ? onRecordStop : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill={recording ? "currentColor" : "none"} />
              <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2" />
            </svg>
          </IconButton>
        </>
      ) : null}
      <button
        type="submit"
        disabled={disabled || scripted || !value.trim()}
        className="h-10 shrink-0 rounded-xl bg-ink px-4 text-sm font-medium text-paper-raised transition-opacity disabled:opacity-35"
      >
        Add
      </button>
    </form>
  );
}

function IconButton({
  label,
  active,
  disabled,
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors select-none hover:bg-paper-sunk hover:text-ink disabled:opacity-40",
        active && "bg-[oklch(60%_0.2_25)] text-paper-raised hover:bg-[oklch(60%_0.2_25)] hover:text-paper-raised",
      )}
    >
      {children}
    </button>
  );
}
