import { describe, expect, it } from 'vitest';
import { useTiles } from '../composables/useTiles';

describe('useTiles', () => {
  it('does not move before the first tile', () => {
    const { prevTile, hasPrev, selectedTile } = useTiles(() => ({}), () => {});

    expect(hasPrev.value).toBe(false);
    prevTile();

    expect(hasPrev.value).toBe(false);
    expect(selectedTile.value).toBeNull();
  });
});
