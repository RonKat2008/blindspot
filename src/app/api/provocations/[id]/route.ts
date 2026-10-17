// OWNER: codex-codex. PATCH UpdateProvocationBody -> OkResponse
export const dynamic = "force-dynamic";
const notImplemented = (): Response => Response.json({ error: "not implemented" }, { status: 501 });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;
  const { id } = await params;
  void id;
  return notImplemented();
}
