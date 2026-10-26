/**
 * Codespaces exposes the active workspace name and forwarded-port domain as
 * environment variables. Match those values instead of request host headers,
 * which may be rewritten by the forwarding proxy.
 */
export function isCodespacesClientOrigin(
  origin: string | undefined,
  codespaceName = process.env.CODESPACE_NAME,
  forwardingDomain =
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev',
): boolean {
  if (!origin || !codespaceName || !forwardingDomain) return false;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const expectedHost =
    `${codespaceName}-5173.${forwardingDomain}`.toLowerCase();

  return (
    parsed.protocol === 'https:' &&
    parsed.origin === origin &&
    parsed.hostname.toLowerCase() === expectedHost
  );
}
