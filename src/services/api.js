import { DATA_URL } from '../config';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }

  get isAuthError() {
    return this.code === 401 || this.code === 403;
  }
}

const parseResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('サーバーからの応答を読み取れませんでした。', 0);
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
    const { code, message } = data.error;
    throw new ApiError(message || 'APIエラーが発生しました。', code || 0);
  }
  return data;
};

// The credential to send, as a [parameter name, value] pair. A share token
// wins over an owner session, which wins over a raw ID token.
const authEntry = (auth) => {
  if (auth?.shareToken) {
    return ['share_token', auth.shareToken];
  }
  if (auth?.sessionToken) {
    return ['session_token', auth.sessionToken];
  }
  if (auth?.idToken) {
    return ['id_token', auth.idToken];
  }
  return null;
};

export const fetchItems = async (auth) => {
  const url = new URL(DATA_URL);
  const entry = authEntry(auth);
  if (entry) {
    url.searchParams.set(entry[0], entry[1]);
  }
  const response = await fetch(url.toString());
  return parseResponse(response);
};

export const postAction = async (auth, action, payload = {}) => {
  const body = { action, ...payload };
  const entry = authEntry(auth);
  if (entry) {
    body[entry[0]] = entry[1];
  }
  const response = await fetch(DATA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
};

// GET endpoints that take an action name plus one credential parameter.
const getAction = async (params) => {
  const url = new URL(DATA_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString());
  return parseResponse(response);
};

export const issueShare = (sessionToken) =>
  getAction({ action: 'issue_share', session_token: sessionToken });

export const revokeShare = (sessionToken) =>
  getAction({ action: 'revoke_share', session_token: sessionToken });

// Exchange a Google ID token (valid for about an hour) for a 30-day
// owner session token right after sign-in.
export const exchangeSession = (idToken) =>
  getAction({ action: 'exchange_session', id_token: idToken });

export const revokeSession = (sessionToken) =>
  getAction({ action: 'revoke_session', session_token: sessionToken });
