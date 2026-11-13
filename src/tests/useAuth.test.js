import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useAuth } from '../composables/useAuth';

vi.mock('../services/api', () => ({
  exchangeSession: vi.fn(),
  revokeSession: vi.fn()
}));

const { exchangeSession, revokeSession } = await import('../services/api');

const mountAuth = () => {
  let auth;
  const component = defineComponent({
    setup() {
      auth = useAuth();
      return () => h('div');
    }
  });
  const wrapper = mount(component);
  return { auth, wrapper };
};

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
    delete window.google;
    exchangeSession.mockReset().mockResolvedValue({ session_token: 'sess-1' });
    revokeSession.mockReset().mockResolvedValue({ revoked: true });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
    delete window.google;
  });

  it('starts unauthenticated without any token', () => {
    const { auth } = mountAuth();
    expect(auth.isAuthenticated.value).toBe(false);
    expect(auth.isOwner.value).toBe(false);
    expect(auth.authParams.value).toEqual({ sessionToken: '', shareToken: '' });
  });

  it('takes the share token from the URL hash and stores it', () => {
    window.history.replaceState(null, '', `${window.location.pathname}#share=hash-token`);
    const { auth } = mountAuth();
    expect(auth.shareToken.value).toBe('hash-token');
    expect(auth.isAuthenticated.value).toBe(true);
    expect(sessionStorage.getItem('bucket-list:share-token')).toBe('hash-token');
    expect(localStorage.getItem('bucket-list:share-token')).toBe(null);
  });

  it('restores stored tokens and drops legacy tokens', () => {
    sessionStorage.setItem('bucket-list:share-token', 'stored-share');
    localStorage.setItem('bucket-list:share-token', 'legacy-share');
    localStorage.setItem('bucket-list:session-token', 'stored-session');
    localStorage.setItem('bucket-list:id-token', 'stored-id');
    const { auth } = mountAuth();
    expect(auth.shareToken.value).toBe('stored-share');
    expect(auth.sessionToken.value).toBe('stored-session');
    expect(auth.isOwner.value).toBe(true);
    expect(localStorage.getItem('bucket-list:share-token')).toBe(null);
    expect(localStorage.getItem('bucket-list:id-token')).toBe(null);
  });

  it('exchanges the Google credential for a session and stores it', async () => {
    const { auth } = mountAuth();
    await auth.handleGoogleCredential({});
    expect(auth.sessionToken.value).toBe('');
    await auth.handleGoogleCredential({ credential: 'cred-1' });
    expect(exchangeSession).toHaveBeenCalledWith('cred-1');
    expect(auth.sessionToken.value).toBe('sess-1');
    expect(localStorage.getItem('bucket-list:session-token')).toBe('sess-1');
  });

  it('stays signed out when the exchange returns no session', async () => {
    exchangeSession.mockResolvedValue({});
    const { auth } = mountAuth();
    await auth.handleGoogleCredential({ credential: 'cred-1' });
    expect(auth.sessionToken.value).toBe('');
    expect(auth.isAuthenticated.value).toBe(false);
  });

  it('stays signed out when the exchange returns nothing', async () => {
    exchangeSession.mockResolvedValue(undefined);
    const { auth } = mountAuth();
    await auth.handleGoogleCredential({ credential: 'cred-1' });
    expect(auth.sessionToken.value).toBe('');
  });

  it('stays signed out when the exchange fails', async () => {
    exchangeSession.mockRejectedValue(new Error('forbidden email'));
    const { auth } = mountAuth();
    await auth.handleGoogleCredential({ credential: 'cred-1' });
    expect(auth.sessionToken.value).toBe('');
    expect(auth.isAuthenticated.value).toBe(false);
  });

  it('clears both tokens on logout and revokes the session', () => {
    sessionStorage.setItem('bucket-list:share-token', 'stored-share');
    localStorage.setItem('bucket-list:session-token', 'stored-session');
    const { auth } = mountAuth();
    auth.logout();
    expect(auth.isAuthenticated.value).toBe(false);
    expect(sessionStorage.getItem('bucket-list:share-token')).toBe(null);
    expect(localStorage.getItem('bucket-list:session-token')).toBe(null);
    expect(revokeSession).toHaveBeenCalledWith('stored-session');
  });

  it('logs out without a revoke when there is no session', () => {
    sessionStorage.setItem('bucket-list:share-token', 'stored-share');
    const { auth } = mountAuth();
    auth.logout();
    expect(auth.isAuthenticated.value).toBe(false);
    expect(revokeSession).not.toHaveBeenCalled();
  });

  it('still logs out when the revoke request fails', async () => {
    revokeSession.mockRejectedValue(new Error('offline'));
    localStorage.setItem('bucket-list:session-token', 'stored-session');
    const { auth } = mountAuth();
    auth.logout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auth.isAuthenticated.value).toBe(false);
  });

  it('uses the already loaded Google script and renders the button', async () => {
    const initialize = vi.fn();
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };

    const { auth } = mountAuth();
    await nextTick();
    expect(auth.googleReady.value).toBe(true);

    const root = document.createElement('div');
    auth.googleButtonRoot.value = root;
    await nextTick();

    expect(initialize).toHaveBeenCalledWith({
      client_id: expect.any(String),
      callback: auth.handleGoogleCredential
    });
    expect(renderButton).toHaveBeenCalledWith(root, expect.objectContaining({ theme: 'outline' }));
  });

  it('does not render the button while Google is unavailable', async () => {
    const { auth } = mountAuth();
    await nextTick();
    // The GIS script was appended but never loaded: google stays undefined.
    auth.googleReady.value = true;
    auth.googleButtonRoot.value = document.createElement('div');
    await nextTick();
    expect(auth.googleScriptError.value).toBe(false);
  });

  const lastGisScript = () => {
    const scripts = document.head.querySelectorAll('script[src*="gsi/client"]');
    return scripts[scripts.length - 1];
  };

  it('marks googleReady when the GIS script loads', async () => {
    const { auth } = mountAuth();
    const script = lastGisScript();
    expect(script).toBeTruthy();
    script.onload();
    await nextTick();
    expect(auth.googleReady.value).toBe(true);
  });

  it('marks googleScriptError when the GIS script fails', async () => {
    const { auth } = mountAuth();
    const script = lastGisScript();
    script.onerror();
    await nextTick();
    expect(auth.googleScriptError.value).toBe(true);
  });
});
