import { NextResponse } from "next/server";
import { classifyEngagement, type ClassifierInput } from "@/layers/classifier";

// POST /api/engagement/classify
//
// Phase 1 surface. The student session page will call this every 5 messages
// or 60 seconds (whichever comes first) with the recent turns and behavioural
// signals. Result is persisted as an engagementSnapshot in Firestore and
// mirrored to RTDB liveSessions so the teacher dashboard receives the
// update without polling.

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ClassifierInput | null;
  if (!body || !Array.isArray(body.turns) || !body.signals) {
    return NextResponse.json({ error: "turns and signals required" }, { status: 400 });
  }
  const result = await classifyEngagement(body);
  return NextResponse.json(result);
}
