import { describe, expect, it } from 'vitest';
import { sortItems } from '../utils/sortItems';

// Abnormal cases for the sorter: its input is the normalized list, but
// a non-array must read as an empty list (the filterFlagged precedent
// in list-of-stuff-admin) rather than throwing, and rows whose fields
// carry deformed types must be conserved without throwing.
describe('sortItems abnormal inputs', () => {
  it('reads a missing list as empty', () => {
    expect(sortItems(null)).toEqual([]);
    expect(sortItems(undefined)).toEqual([]);
  });

  it('reads non-array shapes as empty', () => {
    expect(sortItems('junk')).toEqual([]);
    expect(sortItems({ items: [] })).toEqual([]);
    expect(sortItems(42)).toEqual([]);
  });

  it('conserves rows whose fields carry deformed types', () => {
    const items = [
      { id: { raw: 1 }, targetAge: { age: 40 }, completed: 'yes', completedAt: {} },
      { id: 2, targetAge: [40], completed: 1, completedAt: ['2024-01-01'] },
      { id: 3, targetAge: 40, completed: true, completedAt: '2024-01-01' }
    ];

    const result = sortItems(items);

    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining(items));
    expect(result[2]).toBe(items[2]);
  });

  it('treats string completion flags as not completed, like its consumers', () => {
    const items = [
      { id: 1, completed: true, completedAt: '2024-01-01' },
      { id: 2, completed: 'true', targetAge: 90 },
      { id: 3, completed: false, targetAge: 10 }
    ];

    const result = sortItems(items);

    expect(result.map((item) => item.id)).toEqual([3, 2, 1]);
  });
});
