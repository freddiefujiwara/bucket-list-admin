import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../services/api', () => ({
  exchangeSession: vi.fn(),
  revokeSession: vi.fn()
}));

// useAuth computes its storage keys at module load from
// isStagingBuild(), so each case re-imports the module with a
// stubbed environment.
const mountAuth = async () => {
  vi.resetModules();
  const { useAuth } = await import('../composables/useAuth');
  let auth;
  const component = defineComponent({
    setup() {
      auth = useAuth();
      return () => h('div');
    }
  });
  mount(component);
  return auth;
};

describe('useAuth in a staging build', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STAGING', '1');
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('restores tokens from the :staging-suffixed keys only', async () => {
    localStorage.setItem('bucket-list:session-token:staging', 'staging-session');
    localStorage.setItem('bucket-list:session-token', 'prod-session');
    sessionStorage.setItem('bucket-list:share-token:staging', 'staging-share');
    sessionStorage.setItem('bucket-list:share-token', 'prod-share');
    const auth = await mountAuth();
    expect(auth.sessionToken.value).toBe('staging-session');
    expect(auth.shareToken.value).toBe('staging-share');
  });

  it('stores a hash share token under the staging key in sessionStorage', async () => {
    window.history.replaceState(null, '', `${window.location.pathname}#share=hash-token`);
    const auth = await mountAuth();
    expect(auth.shareToken.value).toBe('hash-token');
    expect(sessionStorage.getItem('bucket-list:share-token:staging')).toBe('hash-token');
    expect(sessionStorage.getItem('bucket-list:share-token')).toBe(null);
    expect(localStorage.getItem('bucket-list:share-token')).toBe(null);
  });
});
