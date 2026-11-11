import { computed, onUnmounted, ref } from 'vue';
import { ApiError, fetchItems, postAction } from '../services/api';
import { normalizeItems } from '../utils/normalizeItems';
import { sortItems } from '../utils/sortItems';
import { stripImageRelatedData } from '../utils/stripImageData';

const emptyFilters = () => ({ category: '', targetAge: null, status: 'all' });

/**
 * Tile state and management actions. `getAuthParams` returns the current
 * credentials ({ sessionToken, shareToken }); `onAuthError` is called with the
 * server message when the credentials are rejected (401/403), so the app
 * can drop them and return to the login gate.
 */
export const useTiles = (getAuthParams, onAuthError) => {
  const tiles = ref([]);
  const loading = ref(false);
  const error = ref('');
  const filters = ref(emptyFilters());
  const selectedIndex = ref(-1);
  const rawData = ref([]);
  const copyDone = ref(false);
  let copyDoneTimer = null;

  const countBy = (key) => {
    const counts = new Map();
    tiles.value.forEach((item) => {
      const value = item[key];
      if (value === '' || value === null || value === undefined) {
        return;
      }
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()].map(([value, count]) => ({ value, count }));
  };

  const categoryOptions = computed(() => countBy('category'));
  const ageOptions = computed(() =>
    countBy('targetAge').sort((a, b) => a.value - b.value)
  );
  const totalCount = computed(() => tiles.value.length);
  const completedCount = computed(
    () => tiles.value.filter((item) => item.completed === true).length
  );

  const filteredTiles = computed(() =>
    tiles.value.filter((item) => {
      if (filters.value.category && item.category !== filters.value.category) {
        return false;
      }
      if (
        filters.value.targetAge !== null &&
        item.targetAge !== filters.value.targetAge
      ) {
        return false;
      }
      if (filters.value.status === 'completed' && item.completed !== true) {
        return false;
      }
      if (filters.value.status === 'uncompleted' && item.completed === true) {
        return false;
      }
      return true;
    })
  );

  const selectedTile = computed(
    () => filteredTiles.value[selectedIndex.value] || null
  );
  const hasPrev = computed(() => selectedIndex.value > 0);
  const hasNext = computed(
    () =>
      selectedIndex.value >= 0 &&
      selectedIndex.value < filteredTiles.value.length - 1
  );

  const handleLoadError = (err) => {
    if (err instanceof ApiError && err.isAuthError) {
      onAuthError(err.message);
      rawData.value = [];
      tiles.value = [];
      return;
    }
    error.value = err instanceof Error ? err.message : 'データ取得に失敗しました。';
    rawData.value = [];
    tiles.value = [];
  };

  const loadTiles = async () => {
    loading.value = true;
    error.value = '';
    filters.value = emptyFilters();
    selectedIndex.value = -1;
    try {
      const data = await fetchItems(getAuthParams());
      rawData.value = data;
      tiles.value = sortItems(normalizeItems(data));
    } catch (err) {
      handleLoadError(err);
    } finally {
      loading.value = false;
    }
  };

  const runWrite = async (action, payload) => {
    try {
      await postAction(getAuthParams(), action, payload);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        onAuthError(err.message);
      }
      throw err;
    }
    await loadTiles();
  };

  const createItem = (fields) => runWrite('add_item', { item: fields });

  const updateItem = (fields) => runWrite('update_item', { item: fields });

  const deleteItem = (id) => runWrite('delete_item', { id });

  const setFilter = (partial) => {
    filters.value = { ...filters.value, ...partial };
    selectedIndex.value = -1;
  };

  const clearFilters = () => {
    filters.value = emptyFilters();
    selectedIndex.value = -1;
  };

  const openTile = (item) => {
    selectedIndex.value = filteredTiles.value.indexOf(item);
  };

  const closeTile = () => {
    selectedIndex.value = -1;
  };

  const nextTile = () => {
    if (hasNext.value) {
      selectedIndex.value += 1;
    }
  };

  const prevTile = () => {
    if (hasPrev.value) {
      selectedIndex.value -= 1;
    }
  };

  const copyTilesJson = async () => {
    const sanitizedData = stripImageRelatedData(rawData.value);
    const jsonText = JSON.stringify(sanitizedData, null, 2);
    await navigator.clipboard.writeText(jsonText);

    copyDone.value = true;
    if (copyDoneTimer) {
      clearTimeout(copyDoneTimer);
    }
    copyDoneTimer = setTimeout(() => {
      copyDone.value = false;
      copyDoneTimer = null;
    }, 3000);
  };

  onUnmounted(() => {
    if (copyDoneTimer) {
      clearTimeout(copyDoneTimer);
    }
  });

  return {
    loading,
    error,
    filters,
    selectedTile,
    filteredTiles,
    categoryOptions,
    ageOptions,
    totalCount,
    completedCount,
    hasPrev,
    hasNext,
    loadTiles,
    createItem,
    updateItem,
    deleteItem,
    setFilter,
    clearFilters,
    openTile,
    closeTile,
    nextTile,
    prevTile,
    copyDone,
    copyTilesJson
  };
};
