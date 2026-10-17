import { SessionScreen } from "@/components/session-screen";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <SessionScreen id={id} review={query.review === "1"} />;
}
