import { describe, expect, it, vi } from 'vitest';
import { confirmDeleteItem } from '../utils/confirmDelete';

describe('confirmDeleteItem', () => {
  it('asks with the shared message and returns the answer', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    expect(confirmDeleteItem()).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith('この項目を削除しますか？');

    confirmSpy.mockReturnValue(false);
    expect(confirmDeleteItem()).toBe(false);

    confirmSpy.mockRestore();
  });
});
