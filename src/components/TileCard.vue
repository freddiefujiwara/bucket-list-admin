<template>
  <article class="card" :class="{ completed: item.completed }" @click="handleSelect">
    <div class="media">
      <img v-if="isDisplayableImage(item.imageUrl)" :src="item.imageUrl" :alt="item.title" loading="lazy" />
      <div v-else class="placeholder" aria-label="NO IMAGE">NO IMAGE</div>
      <div class="info">
        <h2>{{ item.title }}</h2>
        <div class="meta" v-if="item.category || item.targetAge">
          <span v-if="item.category" class="chip">{{ item.category }}</span>
          <span v-if="item.targetAge" class="chip">{{ formatTargetAge(item.targetAge) }}</span>
        </div>
      </div>
    </div>
    <div v-if="item.completed && item.completedAt" class="overlay">
      <span>達成日: {{ formatDate(item.completedAt) }}</span>
    </div>
    <div
      v-if="!item.completed && item.status === 'in_progress'"
      class="overlay progress-overlay"
    >
      <span>仕掛り中</span>
    </div>
  </article>
</template>

<script setup>
import { formatDate, formatTargetAge } from '../utils/formatters';
import { isDisplayableImage } from '../utils/image';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['select']);

const handleSelect = () => {
  emit('select', props.item);
};
</script>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 260px;
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
}

.media {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-elevated);
  position: relative;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-elevated);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.info {
  position: absolute;
  inset: auto 0 0 0;
  background: rgba(2, 6, 23, 0.78);
  color: #ffffff;
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
  color: inherit;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 600;
}

.card.completed {
  filter: grayscale(1);
}

.overlay {
  position: absolute;
  inset: 12px 12px auto 12px;
  background: var(--primary);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  text-align: center;
  pointer-events: none;
}

.progress-overlay {
  background: #b45309;
}
</style>
