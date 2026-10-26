/**
 * Codespaces forwards each local port under a hostname shaped like
 * <codespace-name>-<port>.app.github.dev. Only permit a frontend paired with
 * the same Codespace's API port; never use this exception in production.
 */
export function isCodespacesClientOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  return (
    parsed.protocol === 'https:' &&
    parsed.origin === origin &&
    /^[a-z0-9-]+-5173\.app\.github\.dev$/i.test(parsed.hostname)
  );
}

export function isCodespacesFrontendRequest(
  origin: string | undefined,
  apiHost: string | undefined,
): boolean {
  if (!isCodespacesClientOrigin(origin) || !apiHost) return false;

  const clientHost = new URL(origin as string).hostname.toLowerCase();
  const codespaceName = clientHost.replace(/-5173\.app\.github\.dev$/i, '');
  const normalizedApiHost = apiHost.toLowerCase().replace(/:\d+$/, '');
  return normalizedApiHost === `${codespaceName}-4000.app.github.dev`;
}
