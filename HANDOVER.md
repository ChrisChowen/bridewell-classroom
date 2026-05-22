# Bridewell Classroom — Integration & Handover

For the Unified Projects engineer inheriting this prototype. Goal of this
document: you can scope the integration into the production Bridewell AI in
**well under a day**, because every external dependency sits behind a named,
documented seam.

> Status note: this is an engineering handover. Institutional gates (DPA, DPIA,
> safeguarding sign-off, consent) are tracked separately in `PILOT_READINESS.md`
> and are **not** claimed complete here.

---

## 1. What this is, in one paragraph

A Next.js 15 (App Router, React 19, TypeScript strict) web app. Teachers build a
lesson via an AI wizard, run it live; pupils join with a class code and chat
with a coach-mode AI tutor. The system classifies each pupil's engagement into
five named states and runs **Reason** — a probing interaction that produces
evidence of understanding — surfacing patterns (not alerts) on a live teacher
dashboard. All inference is real LLM calls. Persistence is Firestore (durable) +
Realtime Database (live state).

## 2. The three seams you will repoint

Everything you need to swap to your infrastructure is behind three seams. Touch
these; leave the rest.

### 2a. Model seam — `src/lib/ai/`
- **Entry point:** `callLLM()` in `src/lib/ai/llm.ts`. Every model call in the
  app — tutor, scaffolding, engagement classifier, Reason evaluator, lesson
  planner — goes through it. Nothing else imports an LLM SDK.
- **Job → model mapping:** `src/lib/ai/models.ts` (`MODELS` keyed by job:
  `tutor`, `scaffold`, `classifierFlash`, `classifier`, `reasonEvaluator`,
  `profileUpdater`). Repoint a job to a different model by editing this map.
- **Provider:** `src/lib/ai/providers/`. `LLMProvider` interface in `types.ts`;
  Gemini adapter in `gemini.ts`; registry + selector in `index.ts`.
- **To use your own backend (Vertex / Bedrock / in-house gateway):**
  1. Write an adapter implementing `LLMProvider` (copy `gemini.ts`'s shape).
  2. `registerProvider("yourname", () => new YourProvider())` at app bootstrap.
  3. Set `LLM_PROVIDER=yourname`.
  No route or `src/layers/` change. Proven by `src/lib/ai/llm.test.ts`.
- **Grounding + structured JSON** are part of the provider contract
  (`ProviderGenerateRequest.grounding` / `.responseSchema`). If your backend
  lacks web-search grounding, return no citations — Expert mode degrades to a
  plain answer.

### 2b. Auth seam — `src/lib/firebase/`
- Client auth: `src/lib/firebase/client.ts` + `auth-context.tsx`. Teachers use
  email/password; pupils use anonymous sign-in keyed by a class join code.
- Server verification + privileged writes: `src/lib/firebase/admin.ts`
  (`getAdmin()`), which sets the `role: "teacher"` custom claim and bypasses
  rules for trusted writes.
- **To federate (Entra ID / SAML / OIDC — what schools will want):** Firebase
  Auth supports SAML/OIDC providers; the swap is at the sign-in call sites in
  `auth-context.tsx` + the teacher allowlist check in
  `src/app/api/auth/teacher/route.ts`. The custom-claim model and the
  rules that depend on it stay. **Currently NOT abstracted behind a single
  interface** — this is the least-clean seam; budget for it.

### 2c. Data seam — `src/lib/firebase/`
- Firestore collections: `teachers`, `classes`, `joinCodes`, `pupils`,
  `conversations/{classId}_{pupilUid}/messages`, `engagementSnapshots`,
  `reasonEvents`, `interventions`, `safeguardingEvents`, `lessonLibrary`,
  `learnerProfiles`, `allowedTeacherEmails`, `syllabusSuggestions`.
- RTDB live mirror: `liveSessions/{classId}/{pupils,status,interventions}`.
- Rules: `firestore.rules`, `database.rules.json`.
- **Currently Firestore/RTDB calls are made directly from routes + a few
  client components**, not behind one datastore interface. If you keep
  Firebase, no work. If you must move stores, this is a real refactor — flagged
  honestly.

## 3. Environment / configuration

Server-side (never client-exposed):
- `GEMINI_API_KEY` — only used by the Gemini provider; unused if you swap.
- `LLM_PROVIDER` — selects the backend (default `gemini`).
- Firebase Admin credential: in production use **Application Default
  Credentials** (the Cloud Run service account); locally a gitignored
  `secrets/firebase-admin.json` via `FIREBASE_SERVICE_ACCOUNT_PATH`. See
  `src/lib/firebase/admin.ts` — it auto-detects GCP and prefers ADC.

Client-side (`NEXT_PUBLIC_*`, baked at build): the standard Firebase web config
(`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`,
`MESSAGING_SENDER_ID`, `APP_ID`, `DATABASE_URL`).

## 4. Build & runtime constraints (important)

- **Pinned to Next.js 15.x.** Next 16's Turbopack production bundler mangles
  `firebase-admin` external references and the deployed Cloud Function fails to
  resolve them (ERR_MODULE_NOT_FOUND). Do not upgrade to 16 until the
  firebase-frameworks integration supports it. `serverExternalPackages` in
  `next.config.ts` keeps firebase-admin + Google SDKs out of the bundle.
- Deployed via Firebase Hosting + Cloud Functions (GEN_2, nodejs20,
  `europe-west1`). `firebase deploy --only hosting`.
- CI (`.github/workflows/ci.yml`) gates typecheck + unit tests + build on every
  push/PR to `main`.

## 5. The pedagogy modules (`src/layers/`) — what you're inheriting conceptually

These are provider-agnostic and should transfer wholesale:
- `trigger.ts` — when Reason fires (scaffolding ceiling / lesson-design /
  topic boundary), with precedence.
- `prompts.ts` — the four Reason prompt types + selection.
- `evaluator.ts` — scores the pupil's Reason response → confidence + branch.
- `responder.ts` — branch → next move; **pattern_flag never surfaces a verdict
  to the pupil**, only a dashboard signal.
- `classifier.ts` — five-state engagement classifier (Flash-first, Pro
  escalation), with a safeguarding signal on every call.
The tutor + scaffolding system prompts live in `src/lib/ai/prompts.ts`.

## 6. What you must provide / decide

| Concern | Prototype today | You provide for production |
|---|---|---|
| Model backend | Gemini via `GEMINI_API_KEY` | Your managed model behind an `LLMProvider` adapter |
| Identity | Firebase email/pw + anon join | Entra/SAML/OIDC federation at the auth seam |
| Rate limiting | in-memory per instance | durable (Firestore/RTDB or your gateway) — see `src/lib/rate-limit.ts` |
| Data residency | Firebase `europe-west1` | confirm against school DPA |
| Safeguarding routing | flag + dashboard surface | route to a named DSL + incident workflow |
| Observability | console + fallback flags | your logging/error/cost stack |

## 7. Out of scope until access exists (flagged, not built)

- The pupil's IDE-/device-level activity outside the chat.
- Full chat history without rate limiting.
- The production Bridewell AI's hidden model state.
These were deliberately not assumed; they need access the prototype team does
not have.

---

_Authoritative goal + success criteria: `docs/NORTH_STAR.md`. Live readiness:
`PILOT_READINESS.md`. Working spec: `CLAUDE.md`. Brand: `BRAND.md`._
