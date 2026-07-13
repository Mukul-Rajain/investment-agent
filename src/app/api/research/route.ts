import { NextRequest } from "next/server";
import { runResearchGraph } from "@/lib/agent/graph";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const company: string = (body.company ?? "").trim();

  if (!company) {
    return new Response(JSON.stringify({ error: "Company name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const send = (data: object) => {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(line)).catch(() => {});
  };

  runResearchGraph(company, send)
    .catch((err) => {
      send({ type: "error", message: String(err) });
    })
    .finally(() => {
      writer.close().catch(() => {});
    });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
