/**
 * GitHub Codespaces forwards HTTPS traffic to the local Vite server.
 * Only requests originating from the frontend host itself may have their
 * Origin normalized for the localhost API's cookie-session CSRF check.
 */
export function normalizedDevProxyOrigin(
  origin: string | undefined,
  host: string | undefined,
): string | undefined {
  if (!origin || !host) return undefined;
  try {
    const parsed = new URL(origin);
    if (
      parsed.origin === origin &&
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.host.toLowerCase() === host.toLowerCase()
    ) {
      return 'http://localhost:5173';
    }
  } catch {
    // Invalid, opaque or external origins must not bypass CSRF checks.
  }
  return undefined;
}
