// Session cleanup is handled by Authelia + Redis TTL.
// Authelia configuration.yml: session.expiration = 1h, session.inactivity = 15m.
// Redis automatically evicts expired session keys — no DB job needed.
export async function cleanupInactiveSessions(): Promise<void> {
  // no-op
}

export function startSessionCleanupJob(): NodeJS.Timeout {
  // no-op — return a timer that never fires
  return setInterval(() => {}, 2 ** 31 - 1);
}
