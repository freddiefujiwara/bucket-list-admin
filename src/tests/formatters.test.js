import { describe, expect, it } from 'vitest';
import { formatDate, formatDateInputValue, formatTargetAge } from '../utils/formatters';

describe('formatDate', () => {
  it('formats ISO date strings using Asia/Tokyo parts', () => {
    const input = '2023-11-12T15:00:00.000Z';

    expect(formatDate(input)).toBe('2023年11月13日');
  });

  it('shows the Japan calendar date for late-night UTC timestamps', () => {
    const input = '2023-10-26T15:00:00.000Z';

    expect(formatDate(input)).toBe('2023年10月27日');
  });

  it('returns the original value for invalid dates', () => {
    const input = 'invalid-date';

    expect(formatDate(input)).toBe('invalid-date');
  });
});

describe('formatDateInputValue', () => {
  it('formats ISO timestamps as JST date input values', () => {
    expect(formatDateInputValue('2023-10-27T10:00:00.000Z')).toBe('2023-10-27');
    expect(formatDateInputValue('2023-10-26T16:00:00.000Z')).toBe('2023-10-27');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatDateInputValue('')).toBe('');
    expect(formatDateInputValue(null)).toBe('');
    expect(formatDateInputValue(undefined)).toBe('');
    expect(formatDateInputValue('invalid-date')).toBe('');
  });
});

describe('formatTargetAge', () => {
  it('formats numeric ages as decades', () => {
    expect(formatTargetAge(30)).toBe('目標: 30歳台');
    expect(formatTargetAge('40')).toBe('目標: 40歳台');
  });

  it('passes through non-numeric ages', () => {
    expect(formatTargetAge('Kids')).toBe('目標: Kids');
  });
});
