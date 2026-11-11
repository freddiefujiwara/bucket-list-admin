import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, exchangeSession, fetchItems, issueShare, postAction, revokeSession, revokeShare } from '../services/api';

const jsonResponse = (data) => ({
  json: vi.fn().mockResolvedValue(data)
});

describe('api service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches items with a share token', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));

    const result = await fetchItems({ shareToken: 'share-1', idToken: 'ignored' });

    expect(result).toEqual([{ id: 1 }]);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('share_token=share-1');
    expect(url).not.toContain('id_token');
  });

  it('fetches items with a session token when no share token exists', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchItems({ sessionToken: 'sess-1', shareToken: '' });

    expect(fetch.mock.calls[0][0]).toContain('session_token=sess-1');
    expect(fetch.mock.calls[0][0]).not.toContain('id_token');
  });

  it('fetches items with an id token when no share or session token exists', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchItems({ idToken: 'id-1', shareToken: '' });

    expect(fetch.mock.calls[0][0]).toContain('id_token=id-1');
  });

  it('fetches items without credentials when auth is empty', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchItems({});

    expect(fetch.mock.calls[0][0]).not.toContain('token');
  });

  it('throws an ApiError for error responses', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ error: { code: 401, message: 'missing id token' } })
    );

    const error = await fetchItems({}).catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('missing id token');
    expect(error.code).toBe(401);
    expect(error.isAuthError).toBe(true);
  });

  it('defaults the error message and code when fields are missing', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ error: {} }));

    const error = await fetchItems({}).catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('APIエラーが発生しました。');
    expect(error.code).toBe(0);
    expect(error.isAuthError).toBe(false);
  });

  it('throws an ApiError when the response is not JSON', async () => {
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockRejectedValue(new Error('bad json'))
    });

    const error = await fetchItems({}).catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(0);
  });

  it('posts actions as plain-text JSON with the share token in the body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ ok: true, id: 3 }));

    const result = await postAction(
      { shareToken: 'share-1' },
      'add_item',
      { item: { title: 'X' } }
    );

    expect(result).toEqual({ ok: true, id: 3 });
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toContain('text/plain');
    expect(JSON.parse(options.body)).toEqual({
      action: 'add_item',
      item: { title: 'X' },
      share_token: 'share-1'
    });
  });

  it('posts actions with a session token in the body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await postAction({ sessionToken: 'sess-1' }, 'delete_item');

    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      action: 'delete_item',
      session_token: 'sess-1'
    });
  });

  it('posts actions with an id token and default payload', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await postAction({ idToken: 'id-1' }, 'delete_item');

    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      action: 'delete_item',
      id_token: 'id-1'
    });
  });

  it('issues and revokes share sessions with the owner session', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ share_token: 'tok', expires_at: '2030-01-01' }))
      .mockResolvedValueOnce(jsonResponse({ revoked: true }));

    const issued = await issueShare('sess-1');
    expect(issued.share_token).toBe('tok');
    expect(fetch.mock.calls[0][0]).toContain('action=issue_share');
    expect(fetch.mock.calls[0][0]).toContain('session_token=sess-1');

    const revoked = await revokeShare('sess-1');
    expect(revoked).toEqual({ revoked: true });
    expect(fetch.mock.calls[1][0]).toContain('action=revoke_share');
    expect(fetch.mock.calls[1][0]).toContain('session_token=sess-1');
  });

  it('exchanges an id token for a session and revokes the session', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ session_token: 'sess-1' }))
      .mockResolvedValueOnce(jsonResponse({ revoked: true }));

    const exchanged = await exchangeSession('id-1');
    expect(exchanged.session_token).toBe('sess-1');
    expect(fetch.mock.calls[0][0]).toContain('action=exchange_session');
    expect(fetch.mock.calls[0][0]).toContain('id_token=id-1');

    const revoked = await revokeSession('sess-1');
    expect(revoked).toEqual({ revoked: true });
    expect(fetch.mock.calls[1][0]).toContain('action=revoke_session');
    expect(fetch.mock.calls[1][0]).toContain('session_token=sess-1');
  });
});
