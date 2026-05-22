// Empty stand-in for the `server-only` package under Vitest. The real
// package is a build-time guard that throws if server code is imported
// into a client bundle; in the node test environment it just needs to
// resolve to a no-op so transitively-imported server modules can load.
export {};
