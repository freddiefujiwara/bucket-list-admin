import { describe, expect, it } from 'vitest';
import { formatDate, formatDateInputValue, formatTargetAge } from '../utils/formatters';

// Abnormal cases for the display formatters: their inputs trace back to
// /exec payload fields, so a deformed value must still produce a plain
// string for the template — never the raw value back (an object would
// render as "[object Object]").
describe('formatDate abnormal values', () => {
  it('returns an empty string for a missing value', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns an empty string for an object value', () => {
    expect(formatDate({ at: '2024-01-01' })).toBe('');
  });

  it('always returns a string for JSON-shaped values', () => {
    for (const value of [null, 0, 1704067200000, true, 'x', [], {}]) {
      expect(typeof formatDate(value)).toBe('string');
    }
  });

  it('still passes invalid date strings through unchanged', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('returns an empty string for NaN instead of leaking it', () => {
    expect(formatDate(NaN)).toBe('');
  });

  // Found by the property suite: JSON can carry an object whose
  // toString is not a function, and `new Date(value)` throws a
  // TypeError trying to convert it to a primitive.
  it('does not throw on an object with a non-function toString', () => {
    expect(formatDate({ toString: [] })).toBe('');
  });
});

describe('formatDateInputValue abnormal values', () => {
  it('returns an empty string for non-date values', () => {
    expect(formatDateInputValue({})).toBe('');
    expect(formatDateInputValue([])).toBe('');
    expect(formatDateInputValue(true)).toBe('');
    expect(formatDateInputValue(0)).toBe('');
  });

  it('does not throw on a value Date cannot convert to a primitive', () => {
    expect(formatDateInputValue([{ toString: [] }])).toBe('');
  });

  it('accepts epoch-millisecond numbers', () => {
    expect(formatDateInputValue(1704067200000)).toBe('2024-01-01');
  });
});

describe('formatTargetAge abnormal values', () => {
  it('does not leak an object into the label', () => {
    expect(formatTargetAge({ age: 40 })).toBe('目標: ');
  });

  it('does not leak missing or boolean values into the label', () => {
    expect(formatTargetAge(undefined)).toBe('目標: ');
    expect(formatTargetAge(null)).toBe('目標: ');
    expect(formatTargetAge(true)).toBe('目標: ');
  });

  it('keeps string and numeric labels unchanged', () => {
    expect(formatTargetAge('Kids')).toBe('目標: Kids');
    expect(formatTargetAge(30)).toBe('目標: 30歳台');
  });

  it('does not throw on an object with a non-function toString', () => {
    expect(formatTargetAge({ toString: [] })).toBe('目標: ');
  });
});
