/**
 * Disables unwanted zooming behaviors across mobile, tablet, and desktop:
 * - Double-click / double-tap zoom
 * - Multi-touch pinch-to-zoom
 * - Safari iOS gesture zoom (gesturestart)
 * - Ctrl + mousewheel / trackpad pinch zoom
 */
export function initDisableZoom(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Prevent native double-click zoom
  document.addEventListener(
    'dblclick',
    (e: MouseEvent) => {
      e.preventDefault();
    },
    { passive: false }
  );

  // 2. Prevent multi-finger pinch to zoom on touchscreens
  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 3. Prevent rapid double-tap zoom on iOS and mobile browsers
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
        // Ensure interactive elements still trigger their click action
        const target = e.target as HTMLElement | null;
        const clickable = target?.closest('button, a, input, select, textarea, [role="button"]') as HTMLElement | null;
        if (clickable) {
          clickable.click();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // 4. Prevent iOS Safari pinch/spread gesture zoom
  document.addEventListener('gesturestart', (e: Event) => {
    e.preventDefault();
  });
  document.addEventListener('gesturechange', (e: Event) => {
    e.preventDefault();
  });
  document.addEventListener('gestureend', (e: Event) => {
    e.preventDefault();
  });

  // 5. Prevent Ctrl + Mouse wheel / trackpad pinch zooming
  document.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}
