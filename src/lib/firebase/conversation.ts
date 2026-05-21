// Conversation persistence — pupil session writes each turn to Firestore
// so the teacher dashboard's drill panel can read recent history.
//
// Shape:
//   /conversations/{classId}_{pupilId}/messages/{messageId}
//     - role: 'pupil' | 'tutor'
//     - content: string
//     - timestamp: number
//     - meta?: { fallback?, scaffoldAction?, citationCount? }
//
// The doc id is `${classId}_${pupilId}` so the parent doc is stable —
// security rules can scope writes by checking the resource.id prefix
// matches the auth uid (Phase 3 will tighten the rules; for now
// requests go through the admin SDK via /api/conversation/append).

"use client";

import { getFirebase } from "./client";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  type DocumentData,
} from "firebase/firestore";

export interface ConversationTurn {
  id: string;
  role: "pupil" | "tutor";
  content: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export async function getRecentConversation(
  classId: string,
  pupilId: string,
  count: number = 12
): Promise<ConversationTurn[]> {
  const fb = getFirebase();
  if (!fb.ready) return [];
  const docId = `${classId}_${pupilId}`;
  try {
    const q = query(
      collection(fb.db, "conversations", docId, "messages"),
      orderBy("timestamp", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    const out: ConversationTurn[] = [];
    snap.forEach((d) => {
      const data = d.data() as DocumentData;
      out.push({
        id: d.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp,
        meta: data.meta,
      });
    });
    // Oldest → newest for the panel.
    return out.reverse();
  } catch {
    return [];
  }
}
