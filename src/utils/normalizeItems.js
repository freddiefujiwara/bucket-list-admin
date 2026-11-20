// A payload row is a plain object; anything else (null, scalars,
// arrays) is a deformed row and is dropped at this boundary so one
// bad row can neither throw nor surface as a ghost tile.
const isRow = (item) =>
  item !== null && typeof item === 'object' && !Array.isArray(item);

// Text fields are always strings: numbers are stringified, and
// non-scalar values (objects, arrays, booleans) read as empty.
const asText = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
};

// Target ages are numbers or free-text labels ('Kids'); anything
// else reads as the missing-age default.
const asAge = (value) =>
  typeof value === 'number' || typeof value === 'string' ? value : null;

// Completion timestamps are ISO strings or epoch numbers; anything
// else reads as the missing-timestamp default.
const asTimestamp = (value) =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

export const normalizeItems = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(isRow).map((item, index) => ({
    id: item.id ?? `idx-${index}`,
    category: asText(item.category),
    targetAge: asAge(item.target_age),
    title: asText(item.title),
    note: asText(item.note),
    imageUrl: asText(item.image_url),
    nextAction: asText(item.next_action),
    progress: asText(item.progress),
    status: asText(item.status),
    // Every consumer tests completion with `=== true`, so only a real
    // boolean true marks an item completed; a deformed flag (a string
    // 'false' would otherwise render as completed) reads as false.
    completed: item.completed === true,
    completedAt: asTimestamp(item.completed_at)
  }));
};
