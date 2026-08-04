import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewToken } from 'react-native';

const SETTLE_MS = 200;
const DEFAULT_MAX = 12;

/**
 * Polls only what is on screen.
 *
 * Round-robin through sixty PIDs is a three-second refresh per row, which reads
 * as frozen. Capping the set at a dozen visible rows brings each one back to
 * roughly one and a half updates a second, which reads as live. The set is
 * settled for 200 ms first, or a flick-scroll would rewrite it every frame.
 */
export function useVisiblePids(max: number = DEFAULT_MAX) {
  const [visible, setVisible] = useState<string[]>([]);
  const pending = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = viewableItems
        .map((token) => (token.item as { pid?: string } | null)?.pid)
        .filter((pid): pid is string => typeof pid === 'string')
        .slice(0, max);

      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setVisible((prev) => {
          const candidate = pending.current;
          if (prev.length === candidate.length && prev.every((pid, i) => pid === candidate[i])) {
            return prev;
          }
          return candidate;
        });
      }, SETTLE_MS);
    },
    [max],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 25, minimumViewTime: 150 }),
    [],
  );

  return { visible, onViewableItemsChanged, viewabilityConfig };
}
