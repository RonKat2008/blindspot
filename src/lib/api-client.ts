// Typed fetch wrappers for every route. Throws Error(message) on non-2xx or `{ error }`.
// With NEXT_PUBLIC_USE_MOCKS=true every call resolves from src/lib/mock-state.ts instead.
import type {
  AddIdeasBody,
  AddIdeasResponse,
  CreateSessionBody,
  CreateSessionResponse,
  ExtractResponse,
  OkResponse,
  RealityResponse,
  RegisterDeviceBody,
  RegisterDeviceResponse,
  SessionState,
  UpdateAxesBody,
  UpdateAxesResponse,
  UpdateProvocationBody,
} from "./contract";
import { MOCK_AXES, MOCK_SESSION_ID, MOCK_STATE, mockAddIdeas } from "./mock-state";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const MOCK_LATENCY_MS = 350;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body; handled below
  }
  if (!res.ok || (data && typeof data === "object" && "error" in data)) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

const mock = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), MOCK_LATENCY_MS));

const enc = encodeURIComponent;

export const api = {
  createSession(body: CreateSessionBody): Promise<CreateSessionResponse> {
    if (USE_MOCKS) return mock({ sessionId: MOCK_SESSION_ID, axes: MOCK_AXES });
    return request("POST", "/api/sessions", body);
  },

  getState(sessionId: string): Promise<SessionState> {
    if (USE_MOCKS) return mock(MOCK_STATE);
    return request("GET", `/api/sessions/${enc(sessionId)}/state`);
  },

  updateAxes(sessionId: string, body: UpdateAxesBody): Promise<UpdateAxesResponse> {
    if (USE_MOCKS)
      return mock({
        axes: body.axes.map((a, i) => ({
          id: a.id ?? `ax-new-${i}`,
          poleA: a.poleA,
          poleB: a.poleB,
          userEdited: true,
          position: i,
        })),
      });
    return request("PUT", `/api/sessions/${enc(sessionId)}/axes`, body);
  },

  addIdeas(sessionId: string, body: AddIdeasBody): Promise<AddIdeasResponse> {
    if (USE_MOCKS) return mock(mockAddIdeas(body.texts));
    return request("POST", `/api/sessions/${enc(sessionId)}/ideas`, body);
  },

  updateProvocation(provocationId: string, body: UpdateProvocationBody): Promise<OkResponse> {
    if (USE_MOCKS) return mock({ ok: true as const });
    return request("PATCH", `/api/provocations/${enc(provocationId)}`, body);
  },

  registerDevice(sessionId: string, body: RegisterDeviceBody): Promise<RegisterDeviceResponse> {
    if (USE_MOCKS)
      return mock({
        device: {
          id: "dev-mock",
          sessionId,
          role: body.role,
          capabilities: body.capabilities ?? [],
          speakerName: body.speakerName,
          lastSeen: new Date().toISOString(),
        },
      });
    return request("POST", `/api/sessions/${enc(sessionId)}/devices`, body);
  },

  extract(imageBase64: string): Promise<ExtractResponse> {
    if (USE_MOCKS) return mock({ texts: ["Buddy system for new hires", "Onboarding as a team ritual"] });
    return request("POST", "/api/extract", { imageBase64 });
  },

  reality(ideaIds: string[]): Promise<RealityResponse> {
    if (USE_MOCKS) return mock({ queries: ["peer onboarding buddy program"], resultCounts: [1240] });
    return request("POST", "/api/reality", { ideaIds });
  },
};
