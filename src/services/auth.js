const ACCESS_TOKEN_KEY = 'incuva_access_token';
const REFRESH_TOKEN_KEY = 'incuva_refresh_token';
const LEGACY_ACCESS_TOKEN_KEY = 'jarvis_token';

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function setTokens({ access_token: accessToken, refresh_token: refreshToken }) {
  setToken(accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function removeToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

function readPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const payload = getToken() ? readPayload(getToken()) : null;
  return Boolean(payload?.exp && payload.exp > Date.now() / 1000);
}

export function getAuthHeaders(token = getToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
