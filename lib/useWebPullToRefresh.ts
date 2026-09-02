import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// react-native-web's <RefreshControl> is a complete no-op (it renders a bare <View>
// and drops onRefresh/refreshing entirely) — see node_modules/react-native-web/src/
// exports/RefreshControl. Pull-to-refresh silently does nothing on web unless we
// implement the gesture ourselves. Native platforms already get the real thing, so
// this hook is a no-op there.
const PULL_THRESHOLD = 60;
const RETRIGGER_DELAY = 1200;

function findScrollParent(el: Element | null): Element {
  let node = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement ?? document.documentElement;
}

function scrollTopOf(el: Element): number {
  return el === document.scrollingElement || el === document.documentElement
    ? window.scrollY || document.documentElement.scrollTop || 0
    : el.scrollTop;
}

export function useWebPullToRefresh(onRefresh: () => void, enabled: boolean = true) {
  const busyRef = useRef(false);
  const touchStartYRef = useRef(0);
  const touchScrollParentRef = useRef<Element | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    function trigger() {
      if (busyRef.current) return;
      busyRef.current = true;
      onRefresh();
      setTimeout(() => { busyRef.current = false; }, RETRIGGER_DELAY);
    }

    function onWheel(e: WheelEvent) {
      const parent = findScrollParent(e.target as Element);
      if (scrollTopOf(parent) <= 0 && e.deltaY < -10) trigger();
    }

    function onTouchStart(e: TouchEvent) {
      touchStartYRef.current = e.touches[0]?.clientY ?? 0;
      touchScrollParentRef.current = findScrollParent(e.target as Element);
    }

    function onTouchMove(e: TouchEvent) {
      const parent = touchScrollParentRef.current;
      if (!parent || scrollTopOf(parent) > 0) return;
      const delta = (e.touches[0]?.clientY ?? 0) - touchStartYRef.current;
      if (delta > PULL_THRESHOLD) trigger();
    }

    document.addEventListener('wheel', onWheel, { passive: true, capture: true });
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });
    return () => {
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
    };
  }, [onRefresh, enabled]);
}
