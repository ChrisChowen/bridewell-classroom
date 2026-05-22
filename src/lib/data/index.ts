// Data seam — registry + resolveDataStore accessor.
//
// HANDOVER: to point Bridewell Classroom at a different datastore,
//   1. write an adapter implementing DataStore (see ./providers/firebase.ts),
//   2. registerDataStore("yourname", () => new YourStore()),
//   3. set DATA_PROVIDER=yourname in the environment.
// Feature code reads entities via resolveDataStore(); it never imports the
// Firestore client directly.

import "server-only";
import type { DataStore } from "./types";
import { FirebaseDataStore } from "./providers/firebase";

type StoreFactory = () => DataStore;

const registry = new Map<string, StoreFactory>();
const instances = new Map<string, DataStore>();

export function registerDataStore(name: string, factory: StoreFactory): void {
  registry.set(name.toLowerCase(), factory);
  instances.delete(name.toLowerCase());
}

registerDataStore("firebase", () => new FirebaseDataStore());

export function resolveDataStore(): DataStore {
  const name = (process.env.DATA_PROVIDER || "firebase").toLowerCase();
  const cached = instances.get(name);
  if (cached) return cached;
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(
      `Unknown DATA_PROVIDER "${name}". Registered: ${[...registry.keys()].join(", ") || "(none)"}`,
    );
  }
  const instance = factory();
  instances.set(name, instance);
  return instance;
}

export type { DataStore } from "./types";
