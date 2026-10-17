import type { Metadata, Viewport } from "next";
import { ArView } from "../ArView";

export const metadata: Metadata = { title: "AR view" };
export const viewport: Viewport = { themeColor: "#0b1020", viewportFit: "cover" };

export default async function ArPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArView sessionId={id} />;
}
