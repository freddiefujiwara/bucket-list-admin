// The formatters only accept scalar timestamps and ages: anything
// else (objects, arrays, booleans) is a deformed payload value. This
// also keeps `new Date(...)` and `parseInt(...)` away from objects
// whose toString is not a function, which throw a TypeError when
// converted to a primitive.
const isScalar = (value) => typeof value === 'string' || typeof value === 'number';

export const formatDate = (value) => {
  if (!isScalar(value)) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}年${part('month')}月${part('day')}日`;
};

/** Converts an ISO timestamp to a "YYYY-MM-DD" value (JST) for date inputs. */
export const formatDateInputValue = (iso) => {
  if (!iso || !isScalar(iso)) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const asAgeText = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
};

export const formatTargetAge = (value) => {
  const text = asAgeText(value);
  const numeric = Number.parseInt(text, 10);
  if (Number.isNaN(numeric)) {
    return `目標: ${text}`;
  }
  return `目標: ${numeric}歳台`;
};
