import type { LiveTimingSnapshot } from "@/entities/race/api/openf1";

type DurableObjectId = unknown;
export type F1LiveTimingHubStub = {
  getSnapshot(active: boolean): Promise<LiveTimingSnapshot | null>;
};
export type F1LiveTimingHubNamespace = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): F1LiveTimingHubStub;
};

export async function handleLiveStandings(
  request: Request,
  liveTiming: F1LiveTimingHubNamespace | undefined,
): Promise<Response> {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  if (!liveTiming)
    return Response.json(null, { headers: { "Cache-Control": "no-store" } });
  try {
    const snapshot = await liveTiming
      .get(liveTiming.idFromName("formula-1"))
      .getSnapshot(true);
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.warn("F1 live timing unavailable", cause);
    return Response.json(
      { error: "provider_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } },
    );
  }
}
