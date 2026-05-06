import { useCallback, useRef } from 'react';

interface Options {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

export function useLongPress({ delay = 500, onLongPress, onClick }: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  const activeRef = useRef(false);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const cancel = useCallback(
    (fireClick: boolean) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fireClick && !triggeredRef.current && onClick) onClick();
    },
    [onClick]
  );

  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      start();
    },
    onPointerUp: () => cancel(true),
    onPointerLeave: () => cancel(false),
    onPointerCancel: () => cancel(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
