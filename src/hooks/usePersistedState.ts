import { useState, useCallback } from 'react';
import { loadSetting, saveSetting } from '@/services/storage';

/**
 * localStorageに永続化されるuseState。
 * 初回レンダリング時にlocalStorageから復元し、更新時に自動保存する。
 */
export function usePersistedState<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValueRaw] = useState<T>(() => loadSetting(key, fallback));

  const setValue = useCallback(
    (v: T) => {
      setValueRaw(v);
      saveSetting(key, v);
    },
    [key],
  );

  return [value, setValue];
}
