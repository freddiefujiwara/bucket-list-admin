import { computed, onMounted, ref, watch } from 'vue';
import { GOOGLE_CLIENT_ID } from '../config';
import { exchangeSession, revokeSession } from '../services/api';
import { isStagingBuild } from '../staging-banner.js';
import { parseShareToken } from '../utils/share';

// Storage keys are environment-scoped: localStorage is shared across
// the whole origin, so staging builds must never read or overwrite the
// production tokens (same pattern as tweet/alarm).
const storageKey = (base) => (isStagingBuild() ? `${base}:staging` : base);
const SESSION_TOKEN_KEY = storageKey('bucket-list:session-token');
const SHARE_TOKEN_KEY = storageKey('bucket-list:share-token');
// Older versions persisted the owner-equivalent share token in
// localStorage (in both builds, under this unsuffixed key). The share
// token now lives in sessionStorage only; any leftover localStorage
// copy is dropped at boot.
const LEGACY_SHARE_TOKEN_KEY = 'bucket-list:share-token';
// Written by older versions, which stored the raw Google ID token.
// It expires after about an hour and is never stored anymore; any
// leftover copy is dropped at boot.
const LEGACY_ID_TOKEN_KEY = 'bucket-list:id-token';

/**
 * Authentication for the management app, same scheme as health/asset:
 * the owner signs in with Google and exchanges the (1-hour) ID token
 * for a 30-day owner session, or opens a temporary share link
 * (#share=...) whose token is owner-equivalent for 30 days.
 */
export const useAuth = () => {
  const sessionToken = ref('');
  const shareToken = ref('');
  const googleReady = ref(false);
  const googleScriptError = ref(false);
  const googleButtonRoot = ref(null);

  const isAuthenticated = computed(() => Boolean(shareToken.value || sessionToken.value));
  const isOwner = computed(() => Boolean(sessionToken.value));
  const authParams = computed(() => ({
    sessionToken: sessionToken.value,
    shareToken: shareToken.value
  }));

  // Tokens are read synchronously so callers can react to the initial
  // authentication state during setup.
  const fromHash = parseShareToken(window.location.hash);
  if (fromHash) {
    shareToken.value = fromHash;
    sessionStorage.setItem(SHARE_TOKEN_KEY, fromHash);
  } else {
    shareToken.value = sessionStorage.getItem(SHARE_TOKEN_KEY) || '';
  }
  localStorage.removeItem(LEGACY_SHARE_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ID_TOKEN_KEY);
  sessionToken.value = localStorage.getItem(SESSION_TOKEN_KEY) || '';

  const handleGoogleCredential = async (response) => {
    const credential = response?.credential;
    if (!credential) {
      return;
    }
    // Exchange the ID token for the owner session; only the session
    // token is stored. A failed exchange (or one that returns no
    // session) leaves the app signed out at the gate.
    try {
      const result = await exchangeSession(credential);
      if (result?.session_token) {
        sessionToken.value = result.session_token;
        localStorage.setItem(SESSION_TOKEN_KEY, result.session_token);
      }
    } catch {
      // Stay signed out; the sign-in button remains available.
    }
  };

  const renderGoogleButton = () => {
    if (!googleReady.value || !googleButtonRoot.value) {
      return;
    }
    if (!window.google?.accounts?.id) {
      return;
    }
    googleButtonRoot.value.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential
    });
    window.google.accounts.id.renderButton(googleButtonRoot.value, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill'
    });
  };

  const loadGoogleScript = () => {
    if (window.google?.accounts?.id) {
      googleReady.value = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleReady.value = true;
    };
    script.onerror = () => {
      googleScriptError.value = true;
    };
    document.head.appendChild(script);
  };

  const logout = () => {
    const endingSession = sessionToken.value;
    sessionToken.value = '';
    shareToken.value = '';
    localStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SHARE_TOKEN_KEY);
    if (endingSession) {
      // Revoke the owner session server-side; local logout proceeds
      // regardless of the outcome.
      revokeSession(endingSession).catch(() => {});
    }
  };

  onMounted(loadGoogleScript);
  watch([googleReady, googleButtonRoot], renderGoogleButton);

  return {
    sessionToken,
    shareToken,
    isAuthenticated,
    isOwner,
    authParams,
    googleReady,
    googleScriptError,
    googleButtonRoot,
    handleGoogleCredential,
    logout
  };
};
