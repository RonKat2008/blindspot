"use client";

import { Board } from "@/components/board/board";

/** Back-compat shim: the session screen is now the whiteboard. */
export function SessionScreen({ id }: { id: string; review?: boolean }) {
  return <Board key={id} sessionId={id} />;
}
