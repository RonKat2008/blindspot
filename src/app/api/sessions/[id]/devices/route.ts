// POST /api/sessions/[id]/devices: register a phone / ambient display for a session.
import { createClient } from "@supabase/supabase-js";
import { RegisterDeviceBody, type Device, type RegisterDeviceResponse } from "@/lib/contract";

export const dynamic = "force-dynamic";

type DeviceRow = {
  id: string;
  session_id: string;
  role: "contributor" | "ambient";
  capabilities: string[] | null;
  speaker_name: string | null;
  last_seen: string;
};

function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    capabilities: row.capabilities ?? [],
    speakerName: row.speaker_name ?? undefined,
    lastSeen: row.last_seen,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = RegisterDeviceBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid device registration." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return Response.json({ error: "Supabase is not configured." }, { status: 500 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("devices")
    .insert({
      session_id: id,
      role: parsed.data.role,
      capabilities: parsed.data.capabilities,
      speaker_name: parsed.data.speakerName ?? null,
      last_seen: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[devices] insert failed", error);
    return Response.json({ error: "Couldn't register this device." }, { status: 500 });
  }
  return Response.json({ device: toDevice(data as DeviceRow) } satisfies RegisterDeviceResponse);
}
