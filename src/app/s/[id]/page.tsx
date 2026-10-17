import { Board } from "@/components/board/board";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sandbox?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <Board key={id} sessionId={id} sandbox={query.sandbox === "1"} />;
}
