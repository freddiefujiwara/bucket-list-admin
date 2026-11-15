import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FilterBar from '../components/FilterBar.vue';

const baseProps = {
  categories: [
    { value: 'Travel', count: 2 },
    { value: 'Food', count: 1 }
  ],
  ages: [
    { value: 40, count: 1 },
    { value: 50, count: 2 }
  ],
  filters: { category: '', targetAge: null, status: 'all' },
  shownCount: 3
};

const mountBar = (overrides = {}) =>
  mount(FilterBar, {
    props: { ...baseProps, ...overrides }
  });

describe('FilterBar', () => {
  it('renders groups with counts and the shown count', () => {
    const wrapper = mountBar();

    expect(wrapper.text()).toContain('カテゴリ');
    expect(wrapper.text()).toContain('Travel');
    expect(wrapper.text()).toContain('目標: 40歳台');
    expect(wrapper.text()).toContain('3件を表示');
    expect(wrapper.find('.clear').exists()).toBe(false);
  });

  it('marks the active chips from the filters prop', () => {
    const wrapper = mountBar({
      filters: { category: 'Food', targetAge: 50, status: 'completed' }
    });

    const active = wrapper.findAll('button.chip.active').map((chip) => chip.text());
    expect(active.some((text) => text.startsWith('Food'))).toBe(true);
    expect(active.some((text) => text.startsWith('目標: 50歳台'))).toBe(true);
    expect(active).toContain('達成済み');
    expect(wrapper.find('.clear').exists()).toBe(true);
  });

  it('emits change events for each group', async () => {
    const wrapper = mountBar();
    const chips = wrapper.findAll('button.chip');

    const byLabel = (label) => chips.find((chip) => chip.text().startsWith(label));

    await byLabel('Travel').trigger('click');
    await byLabel('目標: 50歳台').trigger('click');
    await byLabel('未達成').trigger('click');
    await byLabel('すべて').trigger('click');

    expect(wrapper.emitted('change')).toEqual([
      [{ category: 'Travel' }],
      [{ targetAge: 50 }],
      [{ status: 'uncompleted' }],
      [{ category: '' }]
    ]);
  });

  it('emits change with null targetAge from the all-ages chip', async () => {
    const wrapper = mountBar({
      filters: { category: '', targetAge: 40, status: 'all' }
    });

    const ageAll = wrapper
      .findAll('button.chip')
      .filter((chip) => chip.text() === 'すべて')
      .at(1);
    await ageAll.trigger('click');

    expect(wrapper.emitted('change')).toEqual([[{ targetAge: null }]]);
  });

  it('emits change with in_progress from the status chip', async () => {
    const wrapper = mountBar();

    const chip = wrapper
      .findAll('button.chip')
      .find((candidate) => candidate.text() === '仕掛り中');
    await chip.trigger('click');

    expect(wrapper.emitted('change')).toEqual([[{ status: 'in_progress' }]]);
  });

  it('marks the in-progress chip active from the filters prop', () => {
    const wrapper = mountBar({
      filters: { category: '', targetAge: null, status: 'in_progress' }
    });

    const active = wrapper.findAll('button.chip.active').map((chip) => chip.text());
    expect(active).toContain('仕掛り中');
    expect(wrapper.find('.clear').exists()).toBe(true);
  });

  it('emits clear when the clear button is clicked', async () => {
    const wrapper = mountBar({
      filters: { category: '', targetAge: null, status: 'completed' }
    });

    await wrapper.get('.clear').trigger('click');

    expect(wrapper.emitted('clear')).toHaveLength(1);
  });
});
