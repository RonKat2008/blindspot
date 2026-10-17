import { redirect } from "next/navigation";
import { createSandbox } from "@/lib/sandbox-seed";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export default async function PlayPage() {
  const { sessionId } = await createSandbox();
  redirect(`/s/${sessionId}?sandbox=1`);
}
