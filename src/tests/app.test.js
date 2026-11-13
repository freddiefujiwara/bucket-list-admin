import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from '../App.vue';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchItems: vi.fn(),
    postAction: vi.fn(),
    issueShare: vi.fn(),
    revokeShare: vi.fn(),
    exchangeSession: vi.fn().mockResolvedValue({ session_token: 'sess-1' }),
    revokeSession: vi.fn().mockResolvedValue({ revoked: true })
  };
});

const { ApiError, exchangeSession, fetchItems, postAction, revokeSession } = await import('../services/api');

const rawTile = (overrides = {}) => ({
  id: 1,
  category: 'Travel',
  target_age: 40,
  title: 'Alpha',
  note: '',
  image_url: '',
  next_action: '',
  progress: '',
  completed: false,
  completed_at: null,
  ...overrides
});

const sampleRaw = () => [
  rawTile(),
  rawTile({ id: 2, category: 'Food', target_age: 50, title: 'Bravo' }),
  rawTile({
    id: 3,
    category: 'Travel',
    target_age: 50,
    title: 'Charlie',
    completed: true,
    completed_at: '2023-10-26T15:00:00.000Z'
  })
];

const loginAsOwner = () => localStorage.setItem('bucket-list:session-token', 'owner-token');
const loginWithShare = () => sessionStorage.setItem('bucket-list:share-token', 'share-token');

const mountApp = async () => {
  const wrapper = mount(App);
  await flushPromises();
  return wrapper;
};

const filterChip = (wrapper, label) =>
  wrapper.findAll('.filter-bar button.chip').find((chip) => chip.text().startsWith(label));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
    delete window.google;
    fetchItems.mockReset();
    postAction.mockReset();
    postAction.mockResolvedValue({ ok: true });
    exchangeSession.mockReset();
    exchangeSession.mockResolvedValue({ session_token: 'sess-1' });
    revokeSession.mockReset();
    revokeSession.mockResolvedValue({ revoked: true });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
    document.documentElement.removeAttribute('data-theme');
    delete window.google;
    vi.restoreAllMocks();
  });

  it('shows the login gate when unauthenticated', async () => {
    const wrapper = await mountApp();

    expect(wrapper.find('.auth-gate').exists()).toBe(true);
    expect(wrapper.text()).toContain('Googleログインが必要です');
    expect(wrapper.text()).toContain('許可されたアカウントでサインインしてください。');
    expect(fetchItems).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('コピー完了');
  });

  it('renders the admin header without the public site chrome', async () => {
    const wrapper = await mountApp();

    expect(wrapper.get('.header h1').text()).toBe('バケットリスト');
    expect(wrapper.find('.site-nav').exists()).toBe(false);
    expect(wrapper.find('.hero').exists()).toBe(false);
    expect(wrapper.find('.site-footer').exists()).toBe(false);
    // Signed out: the theme toggle is visible, the logout button is not.
    expect(wrapper.find('.logout-btn').exists()).toBe(false);
  });

  describe('theme', () => {
    const themeButton = (wrapper) => wrapper.get('.header-buttons .theme-toggle');

    it('defaults to dark and toggles to light, persisting the choice', async () => {
      const wrapper = await mountApp();

      expect(themeButton(wrapper).text()).toBe('ライト');
      expect(document.documentElement.getAttribute('data-theme')).toBe(null);

      await themeButton(wrapper).trigger('click');

      expect(themeButton(wrapper).text()).toBe('ダーク');
      expect(localStorage.getItem('bucket-list-theme')).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      await themeButton(wrapper).trigger('click');

      expect(themeButton(wrapper).text()).toBe('ライト');
      expect(localStorage.getItem('bucket-list-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe(null);
    });

    it('restores the stored light theme on mount', async () => {
      localStorage.setItem('bucket-list-theme', 'light');

      const wrapper = await mountApp();

      expect(themeButton(wrapper).text()).toBe('ダーク');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  it('shows the share-expired notice when a share session is rejected', async () => {
    loginWithShare();
    fetchItems.mockRejectedValue(new ApiError('share session expired or invalid', 401));

    const wrapper = await mountApp();

    expect(wrapper.find('.share-expired').exists()).toBe(true);
    expect(wrapper.text()).toContain('リンクの有効期限が切れています');
    expect(wrapper.text()).toContain(
      'この一時アクセスリンクは無効か、期限切れです。発行者に新しいリンクを依頼してください。'
    );
    expect(wrapper.text()).not.toContain('Googleログインが必要です');
    expect(localStorage.getItem('bucket-list:share-token')).toBe(null);
  });

  it('shows a notice when the Google script fails to load', async () => {
    const wrapper = mount(App);
    const scripts = document.head.querySelectorAll('script[src*="gsi/client"]');
    const script = scripts[scripts.length - 1];
    expect(script).toBeTruthy();
    script.onerror();
    await flushPromises();

    expect(wrapper.text()).toContain('Googleログインの読み込みに失敗しました');
    wrapper.unmount();
  });

  it('loads and renders tiles for the owner', async () => {
    loginAsOwner();
    fetchItems.mockResolvedValue(sampleRaw());

    const wrapper = await mountApp();

    expect(fetchItems).toHaveBeenCalledWith({ sessionToken: 'owner-token', shareToken: '' });
    expect(wrapper.findAll('article.card')).toHaveLength(3);
    expect(wrapper.text()).toContain('全3件（達成済み 1件）');
    // The owner sees the share panel.
    expect(wrapper.text()).toContain('一時リンク（30日有効）');
  });

  it('loads tiles with a share token and hides the share panel', async () => {
    loginWithShare();
    fetchItems.mockResolvedValue(sampleRaw());

    const wrapper = await mountApp();

    expect(fetchItems).toHaveBeenCalledWith({ sessionToken: '', shareToken: 'share-token' });
    expect(wrapper.findAll('article.card')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('一時リンク（30日有効）');
  });

  it('returns to the login gate when the credentials are rejected', async () => {
    loginAsOwner();
    fetchItems.mockRejectedValue(new ApiError('missing id token', 401));

    const wrapper = await mountApp();

    expect(wrapper.find('.auth-gate').exists()).toBe(true);
    expect(wrapper.text()).toContain('ログインの有効期限が切れました');
    expect(localStorage.getItem('bucket-list:session-token')).toBe(null);
  });

  it('shows the empty state when there are no items', async () => {
    loginAsOwner();
    fetchItems.mockResolvedValue([]);

    const wrapper = await mountApp();

    expect(wrapper.text()).toContain('表示するデータがありません');
  });

  it('shows an error state and reloads from the retry button', async () => {
    loginAsOwner();
    fetchItems
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([rawTile({ id: 9, title: 'Second' })]);

    const wrapper = await mountApp();
    expect(wrapper.text()).toContain('boom');

    await wrapper.get('button.retry').trigger('click');
    await flushPromises();

    expect(fetchItems).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Second');
  });

  it('handles a non-Error load failure', async () => {
    loginAsOwner();
    fetchItems.mockRejectedValue('network error');

    const wrapper = await mountApp();

    expect(wrapper.text()).toContain('データ取得に失敗しました。');
  });

  it('logs out back to the gate', async () => {
    loginAsOwner();
    fetchItems.mockResolvedValue(sampleRaw());
    const wrapper = await mountApp();

    await wrapper.get('.logout-btn').trigger('click');
    await flushPromises();

    expect(wrapper.find('.auth-gate').exists()).toBe(true);
    expect(localStorage.getItem('bucket-list:session-token')).toBe(null);
  });

  it('copies sanitized JSON and shows the success message', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    loginAsOwner();
    fetchItems.mockResolvedValue([
      {
        id: 1,
        title: 'First',
        image_url: 'https://example.com/image.jpg',
        nested: { thumbnail_url: 'https://example.com/t.jpg', note: 'keep' }
      }
    ]);
    const wrapper = await mountApp();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    await wrapper.get('button.copy-btn').trigger('click');
    await wrapper.get('button.copy-btn').trigger('click');

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify([{ id: 1, title: 'First', nested: { note: 'keep' } }], null, 2)
    );
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('コピー完了');

    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper.text()).not.toContain('コピー完了');

    await wrapper.get('button.copy-btn').trigger('click');
    wrapper.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  describe('filtering', () => {
    const mountWithSamples = async () => {
      loginAsOwner();
      fetchItems.mockResolvedValue(sampleRaw());
      return mountApp();
    };

    it('filters by category and clears', async () => {
      const wrapper = await mountWithSamples();

      await filterChip(wrapper, 'Food').trigger('click');
      await flushPromises();
      expect(wrapper.findAll('article.card')).toHaveLength(1);
      expect(wrapper.text()).toContain('1件を表示');

      await wrapper.get('.filter-bar .clear').trigger('click');
      await flushPromises();
      expect(wrapper.findAll('article.card')).toHaveLength(3);
    });

    it('filters by target age', async () => {
      const wrapper = await mountWithSamples();

      await filterChip(wrapper, '目標: 40歳台').trigger('click');
      await flushPromises();

      expect(wrapper.findAll('article.card')).toHaveLength(1);
      expect(wrapper.text()).toContain('Alpha');
    });

    it('filters by status', async () => {
      const wrapper = await mountWithSamples();

      await filterChip(wrapper, '達成済み').trigger('click');
      await flushPromises();
      expect(wrapper.findAll('article.card')).toHaveLength(1);
      expect(wrapper.text()).toContain('Charlie');

      await filterChip(wrapper, '未達成').trigger('click');
      await flushPromises();
      expect(wrapper.findAll('article.card')).toHaveLength(2);
    });

    it('combines category and status filters', async () => {
      const wrapper = await mountWithSamples();

      await filterChip(wrapper, 'Travel').trigger('click');
      await filterChip(wrapper, '未達成').trigger('click');
      await flushPromises();

      expect(wrapper.findAll('article.card')).toHaveLength(1);
      expect(wrapper.text()).toContain('Alpha');
    });
  });

  describe('modal and editing', () => {
    const mountWithSamples = async () => {
      loginAsOwner();
      fetchItems.mockResolvedValue(sampleRaw());
      return mountApp();
    };

    it('opens the modal and navigates between tiles', async () => {
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      expect(wrapper.find('.modal h2').text()).toBe('Alpha');
      expect(wrapper.get('button.prev').attributes('disabled')).toBeDefined();

      await wrapper.get('button.next').trigger('click');
      expect(wrapper.find('.modal h2').text()).toBe('Bravo');

      await wrapper.get('button.next').trigger('click');
      expect(wrapper.find('.modal h2').text()).toBe('Charlie');
      expect(wrapper.text()).toContain('達成日: 2023年10月27日');
      expect(wrapper.get('button.next').attributes('disabled')).toBeDefined();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      await flushPromises();
      expect(wrapper.find('.modal h2').text()).toBe('Charlie');

      await wrapper.get('button.prev').trigger('click');
      expect(wrapper.find('.modal h2').text()).toBe('Bravo');
    });

    it('closes the modal with the Escape key', async () => {
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flushPromises();

      expect(wrapper.find('.modal').exists()).toBe(false);
    });

    it('edits an item from the modal and reloads', async () => {
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('button.edit-button').trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal').exists()).toBe(false);
      const titleInput = wrapper.get('.editor .title-input');
      expect(titleInput.element.value).toBe('Alpha');
      await titleInput.setValue('Alpha改');
      await wrapper.get('.editor form').trigger('submit');
      await flushPromises();

      expect(postAction).toHaveBeenCalledWith(
        { sessionToken: 'owner-token', shareToken: '' },
        'update_item',
        { item: expect.objectContaining({ id: 1, title: 'Alpha改' }) }
      );
      expect(wrapper.find('.editor').exists()).toBe(false);
      expect(fetchItems).toHaveBeenCalledTimes(2);
    });

    it('adds a new item', async () => {
      const wrapper = await mountWithSamples();

      await wrapper.get('.add-btn').trigger('click');
      await wrapper.get('.editor .title-input').setValue('新しい夢');
      await wrapper.get('.editor form').trigger('submit');
      await flushPromises();

      expect(postAction).toHaveBeenCalledWith(
        { sessionToken: 'owner-token', shareToken: '' },
        'add_item',
        { item: expect.objectContaining({ title: '新しい夢' }) }
      );
      expect(wrapper.find('.editor').exists()).toBe(false);
    });

    it('deletes an item from the editor', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('button.edit-button').trigger('click');
      await flushPromises();
      await wrapper.get('.editor .delete-btn').trigger('click');
      await flushPromises();

      expect(postAction).toHaveBeenCalledWith(
        { sessionToken: 'owner-token', shareToken: '' },
        'delete_item',
        { id: 1 }
      );
      expect(wrapper.find('.editor').exists()).toBe(false);
    });

    it('deletes an item from the detail modal', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('.modal .delete-btn').trigger('click');
      await flushPromises();

      expect(postAction).toHaveBeenCalledWith(
        { sessionToken: 'owner-token', shareToken: '' },
        'delete_item',
        { id: 1 }
      );
      expect(wrapper.find('.modal').exists()).toBe(false);
    });

    it('does not delete from the detail modal when confirmation is dismissed', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('.modal .delete-btn').trigger('click');
      await flushPromises();

      expect(postAction).not.toHaveBeenCalled();
      expect(wrapper.find('.modal').exists()).toBe(true);
    });

    it('keeps the modal open and shows the error when deleting from the modal fails', async () => {
      postAction.mockRejectedValue(new Error('削除エラー'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('.modal .delete-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal').exists()).toBe(true);
      expect(wrapper.find('.modal-error').text()).toBe('削除エラー');
    });

    it('uses the fallback message for a non-Error modal delete failure', async () => {
      postAction.mockRejectedValue('boom');
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('.modal .delete-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal').exists()).toBe(true);
      expect(wrapper.find('.modal-error').text()).toBe('削除に失敗しました。');
    });

    it('clears the modal delete error when navigating to another tile', async () => {
      postAction.mockRejectedValue(new Error('削除エラー'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('.modal .delete-btn').trigger('click');
      await flushPromises();
      expect(wrapper.find('.modal-error').text()).toBe('削除エラー');

      await wrapper.get('button.next').trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal h2').text()).toBe('Bravo');
      expect(wrapper.find('.modal-error').exists()).toBe(false);
    });

    it('keeps the editor open and shows the error when saving fails', async () => {
      postAction.mockRejectedValue(new Error('保存エラー'));
      const wrapper = await mountWithSamples();

      await wrapper.get('.add-btn').trigger('click');
      await wrapper.get('.editor .title-input').setValue('失敗する夢');
      await wrapper.get('.editor form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.editor').exists()).toBe(true);
      expect(wrapper.find('.editor-error').text()).toBe('保存エラー');
    });

    it('uses fallback messages for non-Error save and delete failures', async () => {
      postAction.mockRejectedValue('boom');
      const wrapper = await mountWithSamples();

      await wrapper.get('.add-btn').trigger('click');
      await wrapper.get('.editor .title-input').setValue('失敗する夢');
      await wrapper.get('.editor form').trigger('submit');
      await flushPromises();
      expect(wrapper.find('.editor-error').text()).toBe('保存に失敗しました。');

      await wrapper.get('.editor .cancel-btn').trigger('click');
      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('button.edit-button').trigger('click');
      await flushPromises();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await wrapper.get('.editor .delete-btn').trigger('click');
      await flushPromises();
      expect(wrapper.find('.editor-error').text()).toBe('削除に失敗しました。');
    });

    it('shows the server message when deleting fails with an Error', async () => {
      postAction.mockRejectedValue(new Error('削除エラー'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountWithSamples();

      await wrapper.findAll('article.card')[0].trigger('click');
      await wrapper.get('button.edit-button').trigger('click');
      await flushPromises();
      await wrapper.get('.editor .delete-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.editor-error').text()).toBe('削除エラー');
    });

    it('returns to the login gate when a write is rejected as unauthorized', async () => {
      postAction.mockRejectedValue(new ApiError('share session expired or invalid', 401));
      const wrapper = await mountWithSamples();

      await wrapper.get('.add-btn').trigger('click');
      await wrapper.get('.editor .title-input').setValue('期限切れの夢');
      await wrapper.get('.editor form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.auth-gate').exists()).toBe(true);
      expect(localStorage.getItem('bucket-list:session-token')).toBe(null);
    });

    it('cancels the editor without saving', async () => {
      const wrapper = await mountWithSamples();

      await wrapper.get('.add-btn').trigger('click');
      await wrapper.get('.editor .cancel-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.editor').exists()).toBe(false);
      expect(postAction).not.toHaveBeenCalled();
    });
  });
});
