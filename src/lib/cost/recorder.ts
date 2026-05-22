// Wires cost tracking into the model seam, WITHOUT instrumentation.ts (which
// is edge-compiled and can't carry firebase-admin). This module is server-only
// and imported as a side-effect by the nodejs LLM route handlers — so the
// recorder is registered the first time any LLM route loads in an instance,
// and callLLM's hook then records every call in that process. The model seam
// itself stays pure (it only knows about the injected callback).

import "server-only";
import { setUsageRecorder, type LLMUsageRecord } from "@/lib/ai/llm";
import { getAdmin } from "@/lib/firebase/admin";
import { recordUsage } from "./record";

setUsageRecorder((u: LLMUsageRecord) => {
  const a = getAdmin();
  if (a.ready) void recordUsage(a.db, u); // fire-and-forget; never blocks the turn
});
