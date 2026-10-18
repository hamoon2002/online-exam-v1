export function sessionLogoutUrl(reason: unknown): string {
  return reason === 'new-session-started'
    ? '/login?sessionReplaced=1'
    : '/login?sessionExpired=1';
}
export function sessionNotice(params: URLSearchParams): string {
  if (params.get('sessionReplaced') === '1') {
    return 'ورود جدیدی با این حساب انجام شده است. برای ادامه دوباره وارد شوید.';
  }
  if (params.get('sessionExpired') === '1' || params.get('forceLogout') === '1') {
    return 'نشست شما پایان یافته است. لطفاً دوباره وارد شوید.';
  }
  return '';
}
