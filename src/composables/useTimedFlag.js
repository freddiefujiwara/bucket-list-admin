import { onUnmounted, ref } from 'vue';

/**
 * A flag for transient "done" indicators (e.g. a copy confirmation):
 * `flash()` turns it on and it turns itself off after `ms`.
 */
export const useTimedFlag = (ms = 3000) => {
  const flag = ref(false);
  let timer = null;

  const flash = () => {
    flag.value = true;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      flag.value = false;
      timer = null;
    }, ms);
  };

  onUnmounted(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });

  return { flag, flash };
};
