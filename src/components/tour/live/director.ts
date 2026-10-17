// Drives the REAL board through its own DOM (typing, Enter, clicks, file input), so every
// request goes through the same code paths a person would trigger. Every wait has a timeout;
// nothing here can hang the tour.

export class SkipSignal extends Error {}
export class StopSignal extends Error {}

const TICK_MS = 50;

export class Director {
  isPaused = false;
  private skipRequested = false;
  private stopped = false;

  pause(next: boolean): void {
    this.isPaused = next;
  }
  skip(): void {
    this.skipRequested = true;
  }
  stop(): void {
    this.stopped = true;
  }
  /** Called by the runner before each step. */
  resetSkip(): void {
    this.skipRequested = false;
  }

  private check(): void {
    if (this.stopped) throw new StopSignal();
    if (this.skipRequested) throw new SkipSignal();
  }

  /** Sleep that honours pause/skip/stop. Paused time does not count. */
  async sleep(ms: number): Promise<void> {
    let left = ms;
    while (left > 0) {
      this.check();
      await new Promise((r) => window.setTimeout(r, TICK_MS));
      if (!this.isPaused) left -= TICK_MS;
    }
    this.check();
  }

  /** Polls `probe` until it returns a truthy value or the timeout passes (returns null). */
  async waitFor<T>(probe: () => T | null | undefined | false, timeoutMs: number): Promise<T | null> {
    let left = timeoutMs;
    for (;;) {
      const hit = probe();
      if (hit) return hit;
      if (left <= 0) return null;
      await this.sleep(100);
      left -= 100;
    }
  }

  /** Human-like typing into a React-controlled textarea/input. */
  async type(el: HTMLTextAreaElement | HTMLInputElement, text: string, msPerChar = 45): Promise<void> {
    el.focus();
    for (let i = 1; i <= text.length; i += 1) {
      setNativeValue(el, text.slice(0, i));
      await this.sleep(msPerChar + (i % 7 === 0 ? 60 : 0));
    }
  }
}

export function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function pressEnter(el: HTMLElement): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
}

export function $(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}

export function buttonWithText(text: string, root: ParentNode = document): HTMLButtonElement | null {
  const all = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
  return all.find((b) => (b.textContent ?? "").includes(text) && !b.disabled) ?? null;
}

/** A placed (non-pending) sticky/point whose text contains `text`. */
export function stickyWithText(text: string): HTMLElement | null {
  const needle = text.slice(0, 24).toLowerCase();
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-sticky-id]"));
  return (
    all.find((el) => {
      const id = el.dataset.stickyId ?? "";
      const label = `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`.toLowerCase();
      return !id.startsWith("tmp") && !id.startsWith("temp") && label.includes(needle);
    }) ?? null
  );
}

/** Puts a fetched file into the board's own image input, as if picked from the file dialog. */
export async function pickImage(url: string, name: string): Promise<boolean> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"][accept^="image"]');
  if (!input) return false;
  const res = await fetch(url);
  if (!res.ok) return false;
  const blob = await res.blob();
  const file = new File([blob], name, { type: blob.type || "image/jpeg" });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
