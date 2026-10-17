import type { Metadata } from "next";
import { JoinFlow } from "../JoinFlow";

export const metadata: Metadata = { title: "Join the brainstorm" };

export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JoinFlow sessionId={id} />;
}
