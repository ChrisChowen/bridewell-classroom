import { redirect } from "next/navigation";

// Short shareable join URL. The teacher's "copy join link" affordance
// produces `/j/<CODE>` — a single redirect into the regular `/join?code=`
// flow, which handles the pre-fill, focuses the name input, and (if
// Firebase Auth has a persisted anonymous UID from a previous session)
// rejoins the same pupil doc on submit.

export default async function ShortJoinRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const safe = encodeURIComponent(code.toUpperCase());
  redirect(`/join?code=${safe}`);
}
