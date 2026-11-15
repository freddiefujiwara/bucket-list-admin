<template>
  <div class="editor" @click="emit('cancel')">
    <form class="editor-card" @click.stop @submit.prevent="save">
      <h2>{{ isNew ? '項目を追加' : '項目を編集' }}</h2>

      <label class="field">
        <span>タイトル</span>
        <input v-model="form.title" class="title-input" type="text" required />
      </label>

      <div class="field-row">
        <label class="field">
          <span>カテゴリ</span>
          <input
            v-model="form.category"
            class="category-input"
            type="text"
            list="editor-categories"
          />
          <datalist id="editor-categories">
            <option v-for="name in categories" :key="name" :value="name" />
          </datalist>
        </label>
        <label class="field">
          <span>目標年齢</span>
          <select v-model.number="form.targetAge" class="age-select">
            <option v-for="age in AGE_OPTIONS" :key="age" :value="age">
              {{ age }}歳台
            </option>
          </select>
        </label>
      </div>

      <label class="field">
        <span>メモ</span>
        <textarea v-model="form.note" class="note-input" rows="3" />
      </label>

      <label class="field">
        <span>次の一歩</span>
        <input v-model="form.nextAction" class="next-action-input" type="text" />
      </label>

      <label class="field">
        <span>進捗メモ</span>
        <textarea v-model="form.progress" class="progress-input" rows="2" />
      </label>

      <label class="field">
        <span>画像URL</span>
        <input v-model="form.imageUrl" class="image-url-input" type="text" />
      </label>

      <div class="field-row">
        <label class="field">
          <span>状態</span>
          <select v-model="form.status" class="status-select">
            <option value="">未着手</option>
            <option value="in_progress">仕掛り中</option>
          </select>
        </label>
        <label class="field checkbox">
          <input v-model="form.completed" class="completed-input" type="checkbox" />
          <span>達成済み</span>
        </label>
        <label v-if="form.completed" class="field">
          <span>達成日</span>
          <input v-model="form.completedDate" class="completed-date-input" type="date" />
        </label>
      </div>

      <p v-if="errorMessage" class="editor-error">{{ errorMessage }}</p>

      <div class="editor-actions">
        <button
          v-if="!isNew"
          type="button"
          class="delete-btn"
          :disabled="saving"
          @click="remove"
        >
          削除
        </button>
        <span class="spacer" />
        <button type="button" class="cancel-btn" :disabled="saving" @click="emit('cancel')">
          キャンセル
        </button>
        <button type="submit" class="save-btn" :disabled="saving">保存</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';

const AGE_OPTIONS = [40, 50, 60, 70, 80, 90, 100];

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  },
  saving: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['save', 'delete', 'cancel']);

const isNew = computed(() => props.item === null);

const toDateInputValue = (iso) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const form = reactive({
  title: props.item?.title ?? '',
  category: props.item?.category ?? '',
  targetAge: props.item?.targetAge ?? 50,
  note: props.item?.note ?? '',
  nextAction: props.item?.nextAction ?? '',
  progress: props.item?.progress ?? '',
  status: props.item?.status ?? '',
  imageUrl: props.item?.imageUrl ?? '',
  completed: props.item?.completed ?? false,
  completedDate: toDateInputValue(props.item?.completedAt)
});

const save = () => {
  const payload = {
    title: form.title,
    category: form.category,
    target_age: form.targetAge,
    note: form.note,
    next_action: form.nextAction,
    progress: form.progress,
    status: form.completed ? '' : form.status,
    image_url: form.imageUrl,
    completed: form.completed
  };
  if (!isNew.value) {
    payload.id = props.item.id;
  }
  if (form.completed && form.completedDate) {
    payload.completed_at = new Date(`${form.completedDate}T00:00:00+09:00`).toISOString();
  }
  emit('save', payload);
};

const remove = () => {
  if (window.confirm('この項目を削除しますか？')) {
    emit('delete', props.item.id);
  }
};
</script>

<style scoped>
.editor {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  overflow: auto;
  z-index: 1100;
}

.editor-card {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: min(92vw, 560px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editor-card h2 {
  margin: 0;
  font-size: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
  flex: 1;
}

.field input[type="text"],
.field input[type="date"],
.field select,
.field textarea {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 9px 12px;
  font: inherit;
  font-weight: 400;
  color: var(--text);
  background: var(--surface);
}

.field input[type="text"]:focus,
.field input[type="date"]:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.field-row {
  display: flex;
  gap: 14px;
  align-items: flex-end;
}

.field.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.editor-error {
  margin: 0;
  color: var(--error);
  font-size: 0.9rem;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.spacer {
  flex: 1;
}

.delete-btn {
  border: 1px solid var(--error);
  color: var(--error);
  background: none;
  border-radius: 999px;
  padding: 9px 18px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn {
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

.cancel-btn:hover {
  border-color: var(--primary);
}

.save-btn {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #ffffff;
  border-radius: 999px;
  padding: 9px 22px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.delete-btn:disabled,
.cancel-btn:disabled,
.save-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}
</style>
