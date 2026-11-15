<template>
  <div class="filter-bar">
    <div class="filter-group">
      <span class="filter-label">カテゴリ</span>
      <button
        type="button"
        class="chip"
        :class="{ active: filters.category === '' }"
        @click="emitChange({ category: '' })"
      >
        すべて
      </button>
      <button
        v-for="option in categories"
        :key="option.value"
        type="button"
        class="chip"
        :class="{ active: filters.category === option.value }"
        @click="emitChange({ category: option.value })"
      >
        {{ option.value }} <span class="count">{{ option.count }}</span>
      </button>
    </div>

    <div class="filter-group">
      <span class="filter-label">目標年齢</span>
      <button
        type="button"
        class="chip"
        :class="{ active: filters.targetAge === null }"
        @click="emitChange({ targetAge: null })"
      >
        すべて
      </button>
      <button
        v-for="option in ages"
        :key="option.value"
        type="button"
        class="chip"
        :class="{ active: filters.targetAge === option.value }"
        @click="emitChange({ targetAge: option.value })"
      >
        {{ formatTargetAge(option.value) }} <span class="count">{{ option.count }}</span>
      </button>
    </div>

    <div class="filter-group">
      <span class="filter-label">状態</span>
      <button
        v-for="option in statusOptions"
        :key="option.value"
        type="button"
        class="chip"
        :class="{ active: filters.status === option.value }"
        @click="emitChange({ status: option.value })"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="result">
      {{ shownCount }}件を表示
      <button v-if="isFiltered" type="button" class="clear" @click="$emit('clear')">
        絞り込みをクリア
      </button>
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTargetAge } from '../utils/formatters';

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  ages: {
    type: Array,
    default: () => []
  },
  filters: {
    type: Object,
    required: true
  },
  shownCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['change', 'clear']);

const statusOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'uncompleted', label: '未達成' },
  { value: 'in_progress', label: '仕掛り中' },
  { value: 'completed', label: '達成済み' }
];

const isFiltered = computed(
  () =>
    props.filters.category !== '' ||
    props.filters.targetAge !== null ||
    props.filters.status !== 'all'
);

const emitChange = (partial) => {
  emit('change', partial);
};
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  min-width: 4.5em;
}

.chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 12px;
  background: var(--surface-elevated);
  color: var(--muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  border-color: var(--primary);
}

.chip .count {
  color: var(--muted);
  font-size: 0.78rem;
}

.chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.chip.active .count {
  color: #ffffff;
}

.result {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 12px;
}

.clear {
  border: none;
  background: none;
  color: var(--link);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
