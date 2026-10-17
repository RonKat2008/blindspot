import { Board } from "@/components/board/board";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Board key={id} sessionId={id} />;
}
