import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { runAction } from '../utils/runAction';

describe('runAction', () => {
  it('returns true on success and toggles the busy flag', async () => {
    const busy = ref(false);
    const message = ref('previous');
    let busyDuring = null;

    const result = await runAction(
      busy,
      message,
      async () => {
        busyDuring = busy.value;
      },
      '失敗しました。'
    );

    expect(result).toBe(true);
    expect(busyDuring).toBe(true);
    expect(busy.value).toBe(false);
    expect(message.value).toBe('');
  });

  it('stores the error message and returns false when an Error is thrown', async () => {
    const busy = ref(false);
    const message = ref('');

    const result = await runAction(
      busy,
      message,
      async () => {
        throw new Error('サーバーエラー');
      },
      '失敗しました。'
    );

    expect(result).toBe(false);
    expect(busy.value).toBe(false);
    expect(message.value).toBe('サーバーエラー');
  });

  it('stores the fallback message when a non-Error is thrown', async () => {
    const busy = ref(false);
    const message = ref('');

    const result = await runAction(
      busy,
      message,
      async () => {
        throw 'boom';
      },
      '失敗しました。'
    );

    expect(result).toBe(false);
    expect(message.value).toBe('失敗しました。');
  });
});
