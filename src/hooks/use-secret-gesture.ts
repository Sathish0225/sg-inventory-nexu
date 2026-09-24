import { useEffect, useRef } from "react";

/**
 * A deliberately hidden trigger: press and hold for `holdMs`, or tap `taps` times in quick
 * succession. Returns pointer handlers to spread on the target element.
 */
export function useSecretGesture(onTrigger: () => void, { holdMs = 900, taps = 5, windowMs = 2000 } = {}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const tapTimes = useRef<number[]>([]);
  const cancelHold = () => clearTimeout(holdTimer.current);
  useEffect(() => cancelHold, []);

  return {
    onPointerDown: () => {
      cancelHold();
      holdTimer.current = setTimeout(onTrigger, holdMs);
    },
    onPointerUp: cancelHold,
    onPointerLeave: cancelHold,
    onPointerCancel: cancelHold,
    onClick: () => {
      const now = Date.now();
      tapTimes.current = [...tapTimes.current.filter((t) => now - t < windowMs), now];
      if (tapTimes.current.length >= taps) {
        tapTimes.current = [];
        onTrigger();
      }
    },
    // Stop the long press from selecting text or opening a context menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
