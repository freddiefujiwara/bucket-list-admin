import { describe, expect, it } from 'vitest';
import { normalizeItems } from '../utils/normalizeItems';

// Abnormal cases for the /exec payload boundary: bucket-list-gas reads
// Sheets rows, so a deformed row (nulls, scalars, wrong-typed fields)
// must never take the whole list down or leak non-string values into
// the tiles. Non-object entries are dropped, matching the boundary
// guards used by the other admin apps.
describe('normalizeItems abnormal payloads', () => {
  it('drops null entries instead of throwing, keeping valid rows', () => {
    const result = normalizeItems([null, { id: 1, title: 'A' }]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  it('drops undefined entries instead of throwing', () => {
    const result = normalizeItems([undefined, { id: 2, title: 'B' }]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('drops scalar and array entries instead of creating ghost items', () => {
    const result = normalizeItems(['junk', 42, true, [1, 2], { id: 3, title: 'C' }]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('C');
  });

  it('treats a string payload as no items', () => {
    expect(normalizeItems('junk')).toEqual([]);
  });

  // Every consumer (sortItems, useTiles counts/filters, TileCard) tests
  // completion with `=== true`, so only a real boolean true may mark an
  // item completed; a string like 'true' from a deformed row must read
  // as not completed rather than rendering as completed while sorting
  // and counting as not completed.
  it('coerces a string completed flag to boolean false', () => {
    const result = normalizeItems([{ id: 1, completed: 'true' }]);

    expect(result[0].completed).toBe(false);
    expect(typeof result[0].completed).toBe('boolean');
  });

  it('coerces string and numeric completed flags to boolean false', () => {
    const result = normalizeItems([
      { id: 1, completed: 'false' },
      { id: 2, completed: 1 }
    ]);

    expect(result.map((item) => item.completed)).toEqual([false, false]);
  });

  it('keeps a real boolean completed flag untouched', () => {
    const result = normalizeItems([
      { id: 1, completed: true },
      { id: 2, completed: false }
    ]);

    expect(result.map((item) => item.completed)).toEqual([true, false]);
  });

  it('stringifies numeric text fields', () => {
    const result = normalizeItems([{ id: 1, title: 42, category: 7 }]);

    expect(result[0].title).toBe('42');
    expect(result[0].category).toBe('7');
  });

  it('blanks non-scalar text fields instead of leaking objects', () => {
    const result = normalizeItems([
      { id: 1, title: true, note: { x: 1 }, image_url: ['a'], status: null }
    ]);

    expect(result[0].title).toBe('');
    expect(result[0].note).toBe('');
    expect(result[0].imageUrl).toBe('');
    expect(result[0].status).toBe('');
  });

  it('keeps every text field a string for a grab-bag row', () => {
    const [item] = normalizeItems([
      {
        id: 1,
        category: 1,
        title: 2,
        note: false,
        image_url: {},
        next_action: [],
        progress: 3.5,
        status: 'ok'
      }
    ]);

    for (const key of ['category', 'title', 'note', 'imageUrl', 'nextAction', 'progress', 'status']) {
      expect(typeof item[key]).toBe('string');
    }
    expect(item.progress).toBe('3.5');
    expect(item.status).toBe('ok');
  });

  it('drops non-scalar target ages to the missing-age default', () => {
    const result = normalizeItems([
      { id: 1, target_age: { age: 40 } },
      { id: 2, target_age: [40] },
      { id: 3, target_age: true }
    ]);

    expect(result.map((item) => item.targetAge)).toEqual([null, null, null]);
  });

  it('keeps numeric and string target ages untouched', () => {
    const result = normalizeItems([
      { id: 1, target_age: 40 },
      { id: 2, target_age: '40' },
      { id: 3, target_age: 'Kids' }
    ]);

    expect(result.map((item) => item.targetAge)).toEqual([40, '40', 'Kids']);
  });

  it('drops non-scalar completion timestamps to null', () => {
    const result = normalizeItems([
      { id: 1, completed_at: { at: '2024-01-01' } },
      { id: 2, completed_at: ['2024-01-01'] },
      { id: 3, completed_at: true }
    ]);

    expect(result.map((item) => item.completedAt)).toEqual([null, null, null]);
  });

  it('keeps string and epoch completion timestamps untouched', () => {
    const result = normalizeItems([
      { id: 1, completed_at: '2024-01-01' },
      { id: 2, completed_at: 1704067200000 }
    ]);

    expect(result.map((item) => item.completedAt)).toEqual(['2024-01-01', 1704067200000]);
  });

  it('leaves a well-formed row in a mixed payload exactly as before', () => {
    const row = {
      id: 9,
      category: 'Travel',
      target_age: 50,
      title: 'Kyoto',
      note: 'Temples',
      image_url: 'k.jpg',
      next_action: 'Book',
      progress: 'Saving',
      status: 'in_progress',
      completed: false,
      completed_at: null
    };

    const result = normalizeItems([null, row]);

    expect(result).toEqual([
      {
        id: 9,
        category: 'Travel',
        targetAge: 50,
        title: 'Kyoto',
        note: 'Temples',
        imageUrl: 'k.jpg',
        nextAction: 'Book',
        progress: 'Saving',
        status: 'in_progress',
        completed: false,
        completedAt: null
      }
    ]);
  });
});
