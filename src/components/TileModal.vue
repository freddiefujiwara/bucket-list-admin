<template>
  <div class="modal" @click="close">
    <div class="modal-card" @click.stop>
      <button class="modal-close" type="button" @click="close">×</button>
      <div class="modal-media">
        <img v-if="isDisplayableImage(item.imageUrl)" :src="item.imageUrl" :alt="item.title" />
        <div v-else class="modal-placeholder" aria-label="NO IMAGE">NO IMAGE</div>
      </div>
      <div class="modal-body">
        <h2>{{ item.title }}</h2>
        <p v-if="item.note">{{ item.note }}</p>
        <div class="modal-meta">
          <span v-if="item.category" class="chip">{{ item.category }}</span>
          <span v-if="item.targetAge" class="chip">
            {{ formatTargetAge(item.targetAge) }}
          </span>
          <span
            v-if="!item.completed && item.status === 'in_progress'"
            class="chip status-chip"
          >
            仕掛り中
          </span>
        </div>
        <p v-if="item.completedAt" class="modal-completed">
          達成日: {{ formatDate(item.completedAt) }}
        </p>
        <div v-if="item.nextAction" class="modal-manage">
          <h3>次の一歩</h3>
          <p>{{ item.nextAction }}</p>
        </div>
        <div v-if="item.progress" class="modal-manage">
          <h3>進捗メモ</h3>
          <p>{{ item.progress }}</p>
        </div>
        <div class="modal-nav">
          <button type="button" class="nav-button prev" :disabled="!hasPrev" @click="$emit('prev')">
            ← 前の項目
          </button>
          <button type="button" class="nav-button edit-button" @click="$emit('edit')">
            編集する
          </button>
          <button type="button" class="nav-button next" :disabled="!hasNext" @click="$emit('next')">
            次の項目 →
          </button>
        </div>
        <p v-if="deleteError" class="modal-error">{{ deleteError }}</p>
        <div class="modal-actions">
          <button type="button" class="delete-btn" :disabled="deleting" @click="remove">
            削除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { formatDate, formatTargetAge } from '../utils/formatters';
import { isDisplayableImage } from '../utils/image';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  hasPrev: {
    type: Boolean,
    default: false
  },
  hasNext: {
    type: Boolean,
    default: false
  },
  deleting: {
    type: Boolean,
    default: false
  },
  deleteError: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'prev', 'next', 'edit', 'delete']);

const close = () => {
  emit('close');
};

const remove = () => {
  if (window.confirm('この項目を削除しますか？')) {
    emit('delete', props.item.id);
  }
};

const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    close();
  } else if (event.key === 'ArrowLeft') {
    emit('prev');
  } else if (event.key === 'ArrowRight') {
    emit('next');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
}

.modal-card {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  max-width: 720px;
  width: min(90vw, 720px);
  max-height: 90vh;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--text);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  z-index: 1;
}

.modal-media {
  background: var(--surface-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-media img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.modal-placeholder {
  width: 128px;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  border-radius: 12px;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-meta .chip {
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.modal-meta .chip.status-chip {
  border-color: #d97706;
  color: #d97706;
}

.modal-completed {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.modal-manage h3 {
  margin: 0 0 4px;
  font-size: 0.85rem;
  color: var(--primary);
  letter-spacing: 0.06em;
}

.modal-manage p {
  margin: 0;
  white-space: pre-wrap;
}

.modal-nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.nav-button {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 16px;
  background: var(--surface-elevated);
  color: var(--text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-button:hover {
  border-color: var(--primary);
}

.edit-button {
  border-color: var(--primary);
  background: var(--primary);
  color: #ffffff;
}

.edit-button:hover {
  border-color: var(--primary);
}

.nav-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.modal-error {
  margin: 0;
  color: var(--error);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-start;
}

.delete-btn {
  border: 1px solid var(--error);
  color: var(--error);
  background: none;
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}
</style>
