<template>
  <div class="layout">
    <header class="header">
      <h1>バケットリスト</h1>
      <div class="header-actions">
        <div class="header-buttons">
          <button
            ref="themeButton"
            class="theme-toggle"
            type="button"
            @click="toggleTheme"
          >
            {{ themeLabel }}
          </button>
          <button
            v-if="isAuthenticated"
            class="theme-toggle logout-btn"
            type="button"
            @click="logout"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>

    <main>
      <section v-if="shareExpired" class="table-wrap auth-gate share-expired">
        <h2 class="section-title">リンクの有効期限が切れています</h2>
        <p class="meta">
          この一時アクセスリンクは無効か、期限切れです。発行者に新しいリンクを依頼してください。
        </p>
      </section>

      <section v-else-if="!isAuthenticated" class="table-wrap auth-gate">
        <h2 class="section-title">Googleログインが必要です</h2>
        <p class="meta">許可されたアカウントでサインインしてください。</p>
        <p v-if="authNotice" class="error">{{ authNotice }}</p>
        <p v-if="googleScriptError" class="error">
          Googleログインの読み込みに失敗しました。通信環境を確認して再読み込みしてください。
        </p>
        <div
          class="google-login-button"
          :ref="(el) => { googleButtonRoot = el; }"
        />
      </section>

      <template v-else>
        <p v-if="error" class="error">
          {{ error }}
          <button class="retry" type="button" @click="loadTiles">再読み込み</button>
        </p>
        <p v-else-if="loading" class="meta">データを取得しています…</p>
        <section v-else class="table-wrap">
          <div class="stats-row">
            <p class="meta stats">全{{ totalCount }}件（達成済み {{ completedCount }}件）</p>
            <div class="stats-actions">
              <span v-if="copyDone" class="copy-done">コピー完了</span>
              <button class="theme-toggle copy-btn" type="button" @click="copyTilesJson">
                コピー
              </button>
              <button class="add-btn" type="button" @click="openAdd">＋ 項目を追加</button>
            </div>
          </div>
          <FilterBar
            :categories="categoryOptions"
            :ages="ageOptions"
            :filters="filters"
            :shown-count="filteredTiles.length"
            @change="setFilter"
            @clear="clearFilters"
          />
          <p v-if="filteredTiles.length === 0" class="meta">表示するデータがありません。</p>
          <TileGrid v-else :items="filteredTiles" @select="openTile" />
        </section>

        <SharePanel v-if="isOwner" :session-token="sessionToken" />
      </template>
    </main>

    <TileModal
      v-if="selectedTile"
      :item="selectedTile"
      :has-prev="hasPrev"
      :has-next="hasNext"
      :deleting="modalDeleting"
      :delete-error="modalDeleteError"
      @close="closeTile"
      @prev="prevTile"
      @next="nextTile"
      @edit="openEdit"
      @delete="deleteFromModal"
    />

    <ItemEditor
      v-if="editorOpen"
      :item="editorItem"
      :categories="categoryNames"
      :saving="editorSaving"
      :error-message="editorError"
      @save="saveEditor"
      @delete="deleteEditor"
      @cancel="closeEditor"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import FilterBar from './components/FilterBar.vue';
import ItemEditor from './components/ItemEditor.vue';
import SharePanel from './components/SharePanel.vue';
import TileGrid from './components/TileGrid.vue';
import TileModal from './components/TileModal.vue';
import { useAuth } from './composables/useAuth';
import { useTiles } from './composables/useTiles';
import { THEME_KEY, applyTheme, nextTheme, resolveTheme } from './utils/theme';

const authNotice = ref('');
const shareExpired = ref(false);

const theme = ref(resolveTheme(localStorage.getItem(THEME_KEY)));
const themeButton = ref(null);
const themeLabel = computed(() => (theme.value === 'light' ? 'ダーク' : 'ライト'));

const toggleTheme = () => {
  theme.value = nextTheme(theme.value);
  localStorage.setItem(THEME_KEY, theme.value);
  applyTheme(document.documentElement, themeButton.value, theme.value);
};

onMounted(() => {
  applyTheme(document.documentElement, themeButton.value, theme.value);
});

const {
  sessionToken,
  shareToken,
  isAuthenticated,
  isOwner,
  authParams,
  googleScriptError,
  googleButtonRoot,
  logout
} = useAuth();

const handleAuthError = (message) => {
  if (shareToken.value) {
    shareExpired.value = true;
  } else {
    authNotice.value = `ログインの有効期限が切れました。再度ログインしてください。（${message}）`;
  }
  logout();
};

const {
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
} = useTiles(() => authParams.value, handleAuthError);

watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      authNotice.value = '';
      loadTiles();
    }
  },
  { immediate: true }
);

const categoryNames = computed(() => categoryOptions.value.map((option) => option.value));

const editorOpen = ref(false);
const editorItem = ref(null);
const editorSaving = ref(false);
const editorError = ref('');

const openAdd = () => {
  editorItem.value = null;
  editorError.value = '';
  editorOpen.value = true;
};

const openEdit = () => {
  editorItem.value = selectedTile.value;
  editorError.value = '';
  editorOpen.value = true;
  closeTile();
};

const closeEditor = () => {
  editorOpen.value = false;
  editorItem.value = null;
};

const saveEditor = async (payload) => {
  editorSaving.value = true;
  editorError.value = '';
  try {
    if (editorItem.value) {
      await updateItem(payload);
    } else {
      await createItem(payload);
    }
    closeEditor();
  } catch (err) {
    editorError.value = err instanceof Error ? err.message : '保存に失敗しました。';
  } finally {
    editorSaving.value = false;
  }
};

const deleteEditor = async (id) => {
  editorSaving.value = true;
  editorError.value = '';
  try {
    await deleteItem(id);
    closeEditor();
  } catch (err) {
    editorError.value = err instanceof Error ? err.message : '削除に失敗しました。';
  } finally {
    editorSaving.value = false;
  }
};

const modalDeleting = ref(false);
const modalDeleteError = ref('');

watch(selectedTile, () => {
  modalDeleteError.value = '';
});

const deleteFromModal = async () => {
  modalDeleting.value = true;
  modalDeleteError.value = '';
  try {
    await deleteItem(selectedTile.value.id);
    closeTile();
  } catch (err) {
    modalDeleteError.value = err instanceof Error ? err.message : '削除に失敗しました。';
  } finally {
    modalDeleting.value = false;
  }
};
</script>

<style scoped>
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stats {
  margin: 0;
}

.stats-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.add-btn {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #ffffff;
  border-radius: 999px;
  padding: 6px 20px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.retry {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #ffffff;
  border-radius: 999px;
  padding: 6px 20px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: 12px;
}

.copy-done {
  color: var(--primary);
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
