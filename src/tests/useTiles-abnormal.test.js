import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTiles } from '../composables/useTiles';

// Abnormal cases end to end: a deformed /exec payload goes through
// fetch -> normalizeItems -> sortItems. One bad row must not fail the
// whole load, and deformed field types must arrive at the tiles in
// their normalized shape.
const jsonResponse = (data) => ({
  json: vi.fn().mockResolvedValue(data)
});

describe('useTiles abnormal payloads', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps valid rows when the payload contains a null entry', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse([null, { id: 1, title: 'A', completed: false }])
    );
    const tiles = useTiles(() => ({}), () => {});

    await tiles.loadTiles();

    expect(tiles.error.value).toBe('');
    expect(tiles.totalCount.value).toBe(1);
    expect(tiles.filteredTiles.value[0].title).toBe('A');
  });

  it('loads an empty list for a non-array payload without an error', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ items: [] }));
    const tiles = useTiles(() => ({}), () => {});

    await tiles.loadTiles();

    expect(tiles.error.value).toBe('');
    expect(tiles.totalCount.value).toBe(0);
  });

  it('exposes a string completion flag as boolean false on the tile', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse([{ id: 1, title: 'A', completed: 'true', completed_at: '2024-01-01' }])
    );
    const tiles = useTiles(() => ({}), () => {});

    await tiles.loadTiles();

    expect(tiles.filteredTiles.value[0].completed).toBe(false);
    expect(tiles.completedCount.value).toBe(0);
  });

  it('exposes a numeric title as a string on the tile', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ id: 1, title: 42 }]));
    const tiles = useTiles(() => ({}), () => {});

    await tiles.loadTiles();

    expect(tiles.filteredTiles.value[0].title).toBe('42');
  });
});
