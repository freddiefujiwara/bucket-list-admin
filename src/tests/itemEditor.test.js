import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ItemEditor from '../components/ItemEditor.vue';

const existingItem = {
  id: 7,
  title: '沖縄に長期滞在したい',
  category: '場所・旅行',
  targetAge: 50,
  note: '一ヶ月単位で滞在してみたい',
  nextAction: '日程候補を出す',
  progress: '',
  imageUrl: 'https://example.com/okinawa.jpg',
  completed: true,
  completedAt: '2023-10-26T15:00:00.000Z'
};

describe('ItemEditor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the add form with defaults', () => {
    const wrapper = mount(ItemEditor, {
      props: { categories: ['場所・旅行', '健康'] }
    });

    expect(wrapper.find('h2').text()).toBe('項目を追加');
    expect(wrapper.find('.delete-btn').exists()).toBe(false);
    expect(wrapper.findAll('#editor-categories option')).toHaveLength(2);
    expect(wrapper.find('.completed-date-input').exists()).toBe(false);
  });

  it('emits a save payload without an id for a new item', async () => {
    const wrapper = mount(ItemEditor);

    await wrapper.find('.title-input').setValue('新しい夢');
    await wrapper.find('form').trigger('submit');

    const payload = wrapper.emitted('save')[0][0];
    expect(payload).toEqual({
      title: '新しい夢',
      category: '',
      target_age: 50,
      note: '',
      next_action: '',
      progress: '',
      status: '',
      image_url: '',
      completed: false
    });
    expect('id' in payload).toBe(false);
    expect('completed_at' in payload).toBe(false);
  });

  it('includes every edited field in the save payload', async () => {
    const wrapper = mount(ItemEditor, { props: { item: null } });

    await wrapper.find('.title-input').setValue('全部入り');
    await wrapper.find('.category-input').setValue('健康');
    await wrapper.find('.age-select').setValue(70);
    await wrapper.find('.note-input').setValue('メモです');
    await wrapper.find('.next-action-input').setValue('申し込む');
    await wrapper.find('.progress-input').setValue('準備中');
    await wrapper.find('.status-select').setValue('in_progress');
    await wrapper.find('.image-url-input').setValue('https://example.com/x.jpg');
    await wrapper.find('.completed-input').setValue(true);
    await wrapper.find('.completed-date-input').setValue('2026-11-07');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('save')[0][0]).toEqual({
      title: '全部入り',
      category: '健康',
      target_age: 70,
      note: 'メモです',
      next_action: '申し込む',
      progress: '準備中',
      // Completing an item clears its in-progress status.
      status: '',
      image_url: 'https://example.com/x.jpg',
      completed: true,
      completed_at: '2026-11-06T15:00:00.000Z'
    });
  });

  it('prefills and saves the in-progress status', async () => {
    const wrapper = mount(ItemEditor, {
      props: { item: { ...existingItem, completed: false, completedAt: null, status: 'in_progress' } }
    });

    expect(wrapper.find('.status-select').element.value).toBe('in_progress');

    await wrapper.find('form').trigger('submit');

    const payload = wrapper.emitted('save')[0][0];
    expect(payload.status).toBe('in_progress');
    expect(payload.completed).toBe(false);
  });

  it('prefills an existing item and converts the completed date both ways', async () => {
    const wrapper = mount(ItemEditor, { props: { item: existingItem } });

    expect(wrapper.find('h2').text()).toBe('項目を編集');
    expect(wrapper.find('.title-input').element.value).toBe('沖縄に長期滞在したい');
    // 2023-10-26T15:00:00Z is 2023-10-27 in Japan.
    expect(wrapper.find('.completed-date-input').element.value).toBe('2023-10-27');

    await wrapper.find('form').trigger('submit');

    const payload = wrapper.emitted('save')[0][0];
    expect(payload.id).toBe(7);
    expect(payload.completed).toBe(true);
    expect(payload.completed_at).toBe('2023-10-26T15:00:00.000Z');
  });

  it('omits completed_at when the date is cleared', async () => {
    const wrapper = mount(ItemEditor, { props: { item: existingItem } });

    await wrapper.find('.completed-date-input').setValue('');
    await wrapper.find('form').trigger('submit');

    expect('completed_at' in wrapper.emitted('save')[0][0]).toBe(false);
  });

  it('handles an invalid stored completed date', () => {
    const wrapper = mount(ItemEditor, {
      props: { item: { ...existingItem, completedAt: 'not-a-date' } }
    });
    expect(wrapper.find('.completed-date-input').element.value).toBe('');
  });

  it('emits delete only after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const wrapper = mount(ItemEditor, { props: { item: existingItem } });

    await wrapper.find('.delete-btn').trigger('click');
    expect(wrapper.emitted('delete')).toBeUndefined();

    confirmSpy.mockReturnValue(true);
    await wrapper.find('.delete-btn').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[7]]);
  });

  it('emits cancel from the button and the backdrop', async () => {
    const wrapper = mount(ItemEditor);

    await wrapper.find('.cancel-btn').trigger('click');
    await wrapper.find('.editor').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(2);
  });

  it('shows the error message passed in', () => {
    const wrapper = mount(ItemEditor, {
      props: { errorMessage: '保存に失敗しました' }
    });
    expect(wrapper.find('.editor-error').text()).toBe('保存に失敗しました');
  });
});
