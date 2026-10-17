// OWNER: codex-codex. GET /api/sessions/[id]/state (see src/lib/contract.ts route table)
export const dynamic = "force-dynamic";
const notImplemented = (): Response => Response.json({ error: "not implemented" }, { status: 501 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;
  const { id } = await params;
  void id;
  return notImplemented();
}
