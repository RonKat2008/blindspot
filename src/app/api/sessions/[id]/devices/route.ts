// OWNER: codex-codex. POST /api/sessions/[id]/devices (see src/lib/contract.ts route table)
export const dynamic = "force-dynamic";
const notImplemented = (): Response => Response.json({ error: "not implemented" }, { status: 501 });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;
  const { id } = await params;
  void id;
  return notImplemented();
}
