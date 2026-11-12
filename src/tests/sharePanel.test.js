import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SharePanel from '../components/SharePanel.vue';

vi.mock('../services/api', () => ({
  issueShare: vi.fn(),
  revokeShare: vi.fn()
}));

const { issueShare, revokeShare } = await import('../services/api');

const mountPanel = () => mount(SharePanel, { props: { sessionToken: 'owner-token' } });

describe('SharePanel', () => {
  beforeEach(() => {
    issueShare.mockReset();
    revokeShare.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a share link and shows the URL with its expiry', async () => {
    issueShare.mockResolvedValue({
      share_token: 'tok-123',
      expires_at: '2026-12-07T00:00:00.000Z'
    });
    const wrapper = mountPanel();

    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    expect(issueShare).toHaveBeenCalledWith('owner-token');
    const input = wrapper.get('.share-url');
    expect(input.element.value).toContain('#share=tok-123');
    expect(wrapper.text()).toContain('有効期限:');
    expect(wrapper.get('.share-issue').text()).toBe('再発行する');
  });

  it('copies the share URL and resets the label', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    issueShare.mockResolvedValue({
      share_token: 'tok-123',
      expires_at: '2026-12-07T00:00:00.000Z'
    });
    const wrapper = mountPanel();
    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    await wrapper.get('.share-copy').trigger('click');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#share=tok-123'));
    expect(wrapper.get('.share-copy').text()).toBe('コピー完了');

    await wrapper.get('.share-copy').trigger('click');
    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper.get('.share-copy').text()).toBe('コピー');

    // Unmounting with a pending copy timer clears it without errors.
    await wrapper.get('.share-copy').trigger('click');
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('revokes the issued link', async () => {
    issueShare.mockResolvedValue({
      share_token: 'tok-123',
      expires_at: '2026-12-07T00:00:00.000Z'
    });
    revokeShare.mockResolvedValue({ revoked: true });
    const wrapper = mountPanel();
    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    await wrapper.get('.share-revoke').trigger('click');
    await flushPromises();

    expect(revokeShare).toHaveBeenCalledWith('owner-token');
    // v-show による非表示をインラインスタイルで確認する
    // （isVisible() の判定は jsdom / test-utils の版で揺れるため）
    expect(wrapper.find('.share-issued').element.style.display).toBe('none');
    expect(wrapper.text()).toContain('リンクを取り消しました。');
  });

  it('shows the server message when issuing fails', async () => {
    issueShare.mockRejectedValue(new Error('forbidden email'));
    const wrapper = mountPanel();

    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    expect(wrapper.find('.share-message').text()).toBe('forbidden email');
  });

  it('uses a fallback message when issuing fails without an Error', async () => {
    issueShare.mockRejectedValue('boom');
    const wrapper = mountPanel();

    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    expect(wrapper.find('.share-message').text()).toBe('リンクの発行に失敗しました。');
  });

  it('shows the server message when revoking fails', async () => {
    issueShare.mockResolvedValue({
      share_token: 'tok-123',
      expires_at: '2026-12-07T00:00:00.000Z'
    });
    revokeShare.mockRejectedValue(new Error('revoke failed'));
    const wrapper = mountPanel();
    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    await wrapper.get('.share-revoke').trigger('click');
    await flushPromises();

    expect(wrapper.find('.share-message').text()).toBe('revoke failed');
    expect(wrapper.find('.share-issued').isVisible()).toBe(true);
  });

  it('uses a fallback message when revoking fails without an Error', async () => {
    issueShare.mockResolvedValue({
      share_token: 'tok-123',
      expires_at: '2026-12-07T00:00:00.000Z'
    });
    revokeShare.mockRejectedValue('boom');
    const wrapper = mountPanel();
    await wrapper.get('.share-issue').trigger('click');
    await flushPromises();

    await wrapper.get('.share-revoke').trigger('click');
    await flushPromises();

    expect(wrapper.find('.share-message').text()).toBe('リンクの取り消しに失敗しました。');
  });
});
