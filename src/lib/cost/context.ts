// Request-scoped cost attribution context. Carries the classId / teacherUid
// for the current request so the LLM usage recorder can attribute spend
// without changing callLLM's signature (the model seam stays dependency-free
// and unaware of class/teacher concepts). AsyncLocalStorage is a Node
// built-in; the recorder only runs in the nodejs runtime.
import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

export interface CostContext {
  classId?: string;
  teacherUid?: string;
}

const storage = new AsyncLocalStorage<CostContext>();

export function runWithCostContext<T>(ctx: CostContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getCostContext(): CostContext | undefined {
  return storage.getStore();
}
