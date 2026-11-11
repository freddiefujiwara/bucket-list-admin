<template>
  <section class="table-wrap share-panel">
    <h2 class="section-title">一時リンク（30日有効）</h2>
    <p class="share-note">
      発行したリンクは本人の管理用として読み書きできます。発行すると前のリンクは無効になります。
    </p>
    <div v-show="issued" class="share-issued">
      <input class="share-url" type="text" readonly :value="shareUrl" />
      <button type="button" class="share-copy" @click="copyShareUrl">
        {{ copied ? 'コピー完了' : 'コピー' }}
      </button>
      <p class="share-meta">
        有効期限: {{ expiryLabel }}（{{ remainingLabel }}）
      </p>
    </div>
    <p v-if="message" class="share-message">{{ message }}</p>
    <div class="share-actions">
      <button type="button" class="share-issue" :disabled="busy" @click="issue">
        {{ issued ? '再発行する' : 'リンクを発行する' }}
      </button>
      <button
        v-if="issued"
        type="button"
        class="share-revoke"
        :disabled="busy"
        @click="revoke"
      >
        取り消す
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { issueShare, revokeShare } from '../services/api';
import {
  buildShareUrl,
  formatShareExpiry,
  formatShareRemaining,
  shareSecondsLeft
} from '../utils/share';

const props = defineProps({
  sessionToken: {
    type: String,
    required: true
  }
});

const issued = ref(null);
const message = ref('');
const busy = ref(false);
const copied = ref(false);
let copiedTimer = null;

const shareUrl = computed(() =>
  issued.value
    ? buildShareUrl(
        `${window.location.origin}${window.location.pathname}`,
        issued.value.token
      )
    : ''
);

const remainingLabel = computed(() =>
  issued.value
    ? formatShareRemaining(shareSecondsLeft(issued.value.expiresAt, Date.now()))
    : ''
);

const expiryLabel = computed(() =>
  issued.value ? formatShareExpiry(issued.value.expiresAt) : ''
);

const issue = async () => {
  busy.value = true;
  message.value = '';
  try {
    const result = await issueShare(props.sessionToken);
    issued.value = { token: result.share_token, expiresAt: result.expires_at };
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'リンクの発行に失敗しました。';
  } finally {
    busy.value = false;
  }
};

const revoke = async () => {
  busy.value = true;
  message.value = '';
  try {
    await revokeShare(props.sessionToken);
    issued.value = null;
    message.value = 'リンクを取り消しました。';
  } catch (err) {
    message.value = err instanceof Error ? err.message : 'リンクの取り消しに失敗しました。';
  } finally {
    busy.value = false;
  }
};

const copyShareUrl = async () => {
  await navigator.clipboard.writeText(shareUrl.value);
  copied.value = true;
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }
  copiedTimer = setTimeout(() => {
    copied.value = false;
    copiedTimer = null;
  }, 3000);
};

onUnmounted(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }
});
</script>

<style scoped>
.share-panel h2 {
  font-size: 1.05rem;
}

.share-note {
  margin: 0 0 14px;
  color: var(--muted);
  font-size: 0.9rem;
}

.share-issued {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.share-url {
  flex: 1;
  min-width: 240px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 9px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--text);
  background: var(--surface);
}

.share-url:focus {
  outline: none;
  border-color: var(--primary);
}

.share-meta {
  flex-basis: 100%;
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.share-message {
  margin: 0 0 12px;
  color: var(--primary);
  font-size: 0.9rem;
  font-weight: 600;
}

.share-actions {
  display: flex;
  gap: 10px;
}

.share-issue {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #ffffff;
  border-radius: 999px;
  padding: 9px 20px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.share-copy,
.share-revoke {
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--text);
  border-radius: 999px;
  padding: 9px 18px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.share-copy:hover,
.share-revoke:hover {
  border-color: var(--primary);
}

.share-issue:disabled,
.share-copy:disabled,
.share-revoke:disabled {
  opacity: 0.5;
  cursor: wait;
}
</style>
