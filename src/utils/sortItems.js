/**
 * Parses a value into a number. Returns Infinity for invalid numbers.
 * @param {string | number} value The value to parse.
 * @returns {number} The parsed number or Infinity.
 */
const parseAge = (value) => {
  if (value === null || value === undefined) {
    return Infinity;
  }
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? Infinity : num;
};

/**
 * Parses an id into a number for stable ordering. Returns Infinity for
 * non-numeric ids so they keep their relative order at the end.
 * @param {string | number} value The id to parse.
 * @returns {number} The parsed number or Infinity.
 */
const parseId = (value) => {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? Infinity : num;
};

/**
 * Parses a date string into a Date object. Returns null for invalid dates.
 * @param {string | number | Date} value The date value to parse.
 * @returns {Date | null} The parsed Date object or null.
 */
const parseDate = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const compareById = (a, b) => {
  const diff = parseId(a.id) - parseId(b.id);
  return Number.isNaN(diff) ? 0 : diff;
};

/**
 * Orders items deterministically: uncompleted items first (target age
 * ascending, then id ascending), completed items last (completion date
 * ascending, then id ascending). Invalid ages and dates go to the end of
 * their group. The order never changes between loads.
 */
export const sortItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  const uncompletedItems = items.filter((item) => item.completed !== true);
  const completedItems = items.filter((item) => item.completed === true);

  uncompletedItems.sort((a, b) => {
    const ageDiff = parseAge(a.targetAge) - parseAge(b.targetAge);
    if (ageDiff !== 0 && !Number.isNaN(ageDiff)) {
      return ageDiff;
    }
    return compareById(a, b);
  });

  completedItems.sort((a, b) => {
    const dateA = parseDate(a.completedAt);
    const dateB = parseDate(b.completedAt);

    if (dateA === null && dateB === null) return compareById(a, b);
    if (dateA === null) return 1;
    if (dateB === null) return -1;
    const dateDiff = dateA.getTime() - dateB.getTime();
    return dateDiff !== 0 ? dateDiff : compareById(a, b);
  });

  return [...uncompletedItems, ...completedItems];
};
