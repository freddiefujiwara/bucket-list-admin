import { describe, expect, it } from 'vitest';
import { normalizeItems } from '../utils/normalizeItems';

describe('normalizeItems', () => {
  it('normalizes array payloads', () => {
    const result = normalizeItems([
      {
        id: 1,
        category: 'Travel',
        target_age: 30,
        title: 'Tokyo',
        note: 'Visit',
        image_url: 'img.jpg',
        next_action: 'Book the flight',
        progress: 'Saving money',
        status: 'in_progress',
        completed: true,
        completed_at: '2024-01-01'
      }
    ]);

    expect(result).toEqual([
      {
        id: 1,
        category: 'Travel',
        targetAge: 30,
        title: 'Tokyo',
        note: 'Visit',
        imageUrl: 'img.jpg',
        nextAction: 'Book the flight',
        progress: 'Saving money',
        status: 'in_progress',
        completed: true,
        completedAt: '2024-01-01'
      }
    ]);
  });

  it('returns empty array when payload is missing', () => {
    expect(normalizeItems(null)).toEqual([]);
    expect(normalizeItems({ data: [] })).toEqual([]);
  });

  it('uses fallback ids and empty defaults', () => {
    const result = normalizeItems([{}]);

    expect(result[0].id).toBe('idx-0');
    expect(result[0].title).toBe('');
    expect(result[0].note).toBe('');
    expect(result[0].imageUrl).toBe('');
    expect(result[0].completed).toBe(false);
    expect(result[0].completedAt).toBe(null);
    expect(result[0].nextAction).toBe('');
    expect(result[0].progress).toBe('');
    expect(result[0].status).toBe('');
    expect(result[0].category).toBe('');
    expect(result[0].targetAge).toBe(null);
  });

  it('handles not completed items', () => {
    const result = normalizeItems([
      {
        id: 1,
        category: 'Travel',
        target_age: 30,
        title: 'Tokyo',
        note: 'Visit',
        image_url: 'img.jpg',
        completed: false,
        completed_at: null
      }
    ]);

    expect(result).toEqual([
      {
        id: 1,
        category: 'Travel',
        targetAge: 30,
        title: 'Tokyo',
        note: 'Visit',
        imageUrl: 'img.jpg',
        nextAction: '',
        progress: '',
        status: '',
        completed: false,
        completedAt: null
      }
    ]);
  });
});
