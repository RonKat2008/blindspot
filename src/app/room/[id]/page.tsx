import type { Metadata } from "next";
import { RoomCamera } from "../RoomCamera";

export const metadata: Metadata = { title: "Room camera" };

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomCamera sessionId={id} />;
}
