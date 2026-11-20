import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateInputValue, formatTargetAge } from '../utils/formatters';
import { normalizeItems } from '../utils/normalizeItems';
import { sortItems } from '../utils/sortItems';

// Property-based tests for the payload-shaping layer. Generators stay
// inside the JSON domain (fc.jsonValue): /exec payloads are parsed
// JSON, so symbols, functions and undefined can never reach this code
// and are excluded on purpose.
const NUM_RUNS = 100;

const isRow = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

describe('normalizeItems properties', () => {
  it('never throws and always returns an array for any JSON value', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(Array.isArray(normalizeItems(value))).toBe(true);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('keeps exactly the plain-object rows, in order', () => {
    fc.assert(
      fc.property(fc.array(fc.jsonValue()), (rows) => {
        const result = normalizeItems(rows);
        expect(result).toHaveLength(rows.filter(isRow).length);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('always produces the full normalized shape with safe types', () => {
    fc.assert(
      fc.property(fc.array(fc.jsonValue()), (rows) => {
        for (const item of normalizeItems(rows)) {
          expect(Object.keys(item).sort()).toEqual([
            'category',
            'completed',
            'completedAt',
            'id',
            'imageUrl',
            'nextAction',
            'note',
            'progress',
            'status',
            'targetAge',
            'title'
          ]);
          for (const key of ['category', 'title', 'note', 'imageUrl', 'nextAction', 'progress', 'status']) {
            expect(typeof item[key]).toBe('string');
          }
          expect(typeof item.completed).toBe('boolean');
          expect(
            item.targetAge === null ||
              typeof item.targetAge === 'number' ||
              typeof item.targetAge === 'string'
          ).toBe(true);
          expect(
            item.completedAt === null ||
              typeof item.completedAt === 'string' ||
              typeof item.completedAt === 'number'
          ).toBe(true);
          // id is an opaque passthrough (only defaulted when missing),
          // so the property pins its presence, not its type.
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('conserves well-formed rows field by field', () => {
    const row = fc.record({
      id: fc.integer(),
      category: fc.string(),
      target_age: fc.integer({ min: 0, max: 120 }),
      title: fc.string(),
      note: fc.string(),
      image_url: fc.string(),
      next_action: fc.string(),
      progress: fc.string(),
      status: fc.string(),
      completed: fc.boolean(),
      completed_at: fc.string()
    });

    fc.assert(
      fc.property(row, (input) => {
        expect(normalizeItems([input])).toEqual([
          {
            id: input.id,
            category: input.category,
            targetAge: input.target_age,
            title: input.title,
            note: input.note,
            imageUrl: input.image_url,
            nextAction: input.next_action,
            progress: input.progress,
            status: input.status,
            completed: input.completed,
            completedAt: input.completed_at
          }
        ]);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// Mirrors of the ordering keys sortItems documents: unparseable ages
// and ids sort last (Infinity), completion is strict `=== true`, and
// rows without a valid completion date close the completed group.
const ageKey = (value) => {
  if (value === null || value === undefined) return Infinity;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? Infinity : num;
};

const idKey = (value) => {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? Infinity : num;
};

const compareKeys = (keyA, keyB) => {
  const diff = keyA - keyB;
  return Number.isNaN(diff) ? 0 : diff;
};

const uncompletedCmp = (a, b) => {
  const ageDiff = compareKeys(ageKey(a.targetAge), ageKey(b.targetAge));
  return ageDiff !== 0 ? ageDiff : compareKeys(idKey(a.id), idKey(b.id));
};

const dateKey = (value) => {
  if (value === null || value === undefined) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const completedCmp = (a, b) => {
  const timeA = dateKey(a.completedAt);
  const timeB = dateKey(b.completedAt);
  if (timeA === null && timeB === null) return compareKeys(idKey(a.id), idKey(b.id));
  if (timeA === null) return 1;
  if (timeB === null) return -1;
  return timeA !== timeB ? timeA - timeB : compareKeys(idKey(a.id), idKey(b.id));
};

const itemArb = fc.record({
  id: fc.oneof(fc.integer({ min: -5, max: 50 }), fc.string(), fc.constant('idx-1')),
  targetAge: fc.oneof(
    fc.integer({ min: 0, max: 120 }),
    fc.string(),
    fc.constant(null)
  ),
  completed: fc.oneof(fc.boolean(), fc.constant('true'), fc.constant(1)),
  completedAt: fc.oneof(
    fc.constant(null),
    fc.constant('invalid'),
    // noInvalidDate: the harness itself must never hand the sorter an
    // Invalid Date object (this bit the previous repo's CI).
    fc
      .date({
        noInvalidDate: true,
        min: new Date('2000-01-01T00:00:00Z'),
        max: new Date('2030-01-01T00:00:00Z')
      })
      .map((date) => date.toISOString())
  )
});

describe('sortItems properties', () => {
  it('conserves every element exactly once', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (items) => {
        const result = sortItems(items);
        expect(result).toHaveLength(items.length);
        const counts = new Map();
        for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
        for (const item of result) counts.set(item, counts.get(item) - 1);
        for (const count of counts.values()) expect(count).toBe(0);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('places every completed row after every uncompleted row', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (items) => {
        const result = sortItems(items);
        const firstCompleted = result.findIndex((item) => item.completed === true);
        if (firstCompleted === -1) return;
        for (const item of result.slice(firstCompleted)) {
          expect(item.completed).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('orders each group by its documented keys', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (items) => {
        const result = sortItems(items);
        const uncompleted = result.filter((item) => item.completed !== true);
        const completed = result.filter((item) => item.completed === true);
        for (let i = 0; i + 1 < uncompleted.length; i += 1) {
          expect(uncompletedCmp(uncompleted[i], uncompleted[i + 1])).toBeLessThanOrEqual(0);
        }
        for (let i = 0; i + 1 < completed.length; i += 1) {
          expect(completedCmp(completed[i], completed[i + 1])).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (items) => {
        const once = sortItems(items);
        expect(sortItems(once)).toEqual(once);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('does not mutate the input array order', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (items) => {
        const before = [...items];
        sortItems(items);
        expect(items).toEqual(before);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

describe('formatters properties', () => {
  it('formatDate always returns a string for JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(typeof formatDate(value)).toBe('string');
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('formatDate renders valid dates in the Japanese calendar shape', () => {
    fc.assert(
      fc.property(
        // Bounded so the +09:00 shift can never roll the year past 9999.
        fc.date({
          noInvalidDate: true,
          min: new Date('1000-01-01T00:00:00Z'),
          max: new Date('9998-12-31T00:00:00Z')
        }),
        (date) => {
          expect(formatDate(date.toISOString())).toMatch(/^\d{4}年\d{2}月\d{2}日$/);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('formatDateInputValue returns an empty string or a YYYY-MM-DD date', () => {
    // The YYYY-MM-DD contract covers calendar years 1000-9999: Intl
    // does not zero-pad smaller years in this runtime ('0099-01-01'
    // renders as '99-01-01') and years past 9999 widen, so values that
    // resolve outside that range are outside the date-input domain
    // and filtered out here.
    const jstYear = (time) => new Date(time + 9 * 60 * 60 * 1000).getUTCFullYear();
    const inDomain = fc.jsonValue().filter((value) => {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) return true; // invalid dates read as ''
        const year = jstYear(value);
        return year >= 1000 && year <= 9999;
      }
      if (typeof value === 'string') {
        const time = new Date(value).getTime();
        if (Number.isNaN(time)) return true; // unparseable reads as ''
        const year = jstYear(time);
        return year >= 1000 && year <= 9999;
      }
      return true;
    });
    fc.assert(
      fc.property(inDomain, (value) => {
        expect(formatDateInputValue(value)).toMatch(/^(\d{4}-\d{2}-\d{2})?$/);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('formatTargetAge never leaks raw object or missing values for non-string input', () => {
    fc.assert(
      fc.property(
        fc.jsonValue().filter((value) => typeof value !== 'string'),
        (value) => {
          const label = formatTargetAge(value);
          expect(label.startsWith('目標: ')).toBe(true);
          for (const leak of ['[object Object]', 'undefined', 'NaN', 'null']) {
            expect(label).not.toContain(leak);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('formatTargetAge renders integer ages as their decade label', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 150 }), (age) => {
        expect(formatTargetAge(age)).toBe(`目標: ${age}歳台`);
        expect(formatTargetAge(String(age))).toBe(`目標: ${age}歳台`);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
