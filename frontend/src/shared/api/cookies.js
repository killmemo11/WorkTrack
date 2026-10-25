export function getTokenFromCookie(name) {
  const match = document.cookie.split(';').find((c) => c.trim().startsWith(`${name}=`));
  return match ? match.trim().split('=')[1] : null;
}
