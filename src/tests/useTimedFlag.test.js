import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTimedFlag } from '../composables/useTimedFlag';

const mountFlag = (ms) => {
  let api;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useTimedFlag(ms);
        return () => null;
      }
    })
  );
  return { wrapper, api };
};

describe('useTimedFlag', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('turns on when flashed and off after the timeout', () => {
    vi.useFakeTimers();
    const { wrapper, api } = mountFlag(1000);

    expect(api.flag.value).toBe(false);
    api.flash();
    expect(api.flag.value).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(api.flag.value).toBe(false);

    wrapper.unmount();
  });

  it('restarts the timeout when flashed again', () => {
    vi.useFakeTimers();
    const { wrapper, api } = mountFlag(1000);

    api.flash();
    vi.advanceTimersByTime(500);
    api.flash();
    vi.advanceTimersByTime(500);
    expect(api.flag.value).toBe(true);

    vi.advanceTimersByTime(500);
    expect(api.flag.value).toBe(false);

    wrapper.unmount();
  });

  it('clears the pending timer on unmount', () => {
    vi.useFakeTimers();
    const { wrapper, api } = mountFlag(1000);

    api.flash();
    wrapper.unmount();
    vi.advanceTimersByTime(5000);

    expect(api.flag.value).toBe(true);
  });
});
