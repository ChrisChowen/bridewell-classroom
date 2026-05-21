"use client";

// Client-side Firestore reads for the teacher's classes. Writes go through
// the admin route at /api/classes/create (we don't want the client setting
// teacherId or joinCode itself).

import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getFirebase } from "./client";
import type { ClassRecord } from "@/types";

export function subscribeToMyClasses(
  teacherId: string,
  onUpdate: (classes: ClassRecord[]) => void
) {
  const fb = getFirebase();
  if (!fb.ready) return () => {};
  const q = query(
    collection(fb.db, "classes"),
    where("teacherId", "==", teacherId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const out: ClassRecord[] = [];
    snap.forEach((d) => out.push(d.data() as ClassRecord));
    onUpdate(out);
  });
}

export async function createClass(input: {
  idToken: string;
  name: string;
  subject: string;
  school: "KESW" | "Barrow Hills" | "Longacre";
}): Promise<ClassRecord> {
  const res = await fetch("/api/classes/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.idToken}`,
    },
    body: JSON.stringify({ name: input.name, subject: input.subject, school: input.school }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create class");
  return data.class as ClassRecord;
}
