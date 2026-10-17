// OWNER: codex-codex. POST /api/extract (stretch, see src/lib/contract.ts)
export const dynamic = "force-dynamic";
const notImplemented = (): Response => Response.json({ error: "not implemented" }, { status: 501 });

export async function POST(request: Request): Promise<Response> {
  void request;
  return notImplemented();
}
