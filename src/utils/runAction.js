/**
 * Runs an async action behind a busy flag: sets `busy` while the action
 * runs and clears `message` first. On success returns true; on failure
 * stores the error's message (or `fallback` for non-Error throws) in
 * `message` and returns false.
 */
export const runAction = async (busy, message, action, fallback) => {
  busy.value = true;
  message.value = '';
  try {
    await action();
    return true;
  } catch (err) {
    message.value = err instanceof Error ? err.message : fallback;
    return false;
  } finally {
    busy.value = false;
  }
};
