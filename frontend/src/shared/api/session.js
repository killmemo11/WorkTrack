import { getTokenFromCookie } from './cookies';
import { refreshSession } from './client';

export { refreshSession };

export async function fetchWithSession(url, { realm, ...options } = {}) {
  const request = () => fetch(url, { credentials: 'include', ...options });
  let res = await request();
  if (res.status === 401) {
    try {
      await refreshSession(realm);
    } catch {
      return res;
    }
    res = await request();
  }
  return res;
}

export function getCsrfHeader() {
  const token = getTokenFromCookie('csrf_token');
  return token ? { 'X-CSRF-Token': token } : {};
}
