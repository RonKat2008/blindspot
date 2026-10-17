import type { Metadata } from "next";
import { AmbientRoom } from "../AmbientRoom";

export const metadata: Metadata = { title: "Room light" };

export default async function AmbientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AmbientRoom sessionId={id} />;
}
