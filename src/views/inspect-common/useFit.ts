import { useLayoutEffect, useState, type RefObject } from 'react';

export interface Fit {
  readonly width: number;
  readonly height: number;
}

/** Size of an element, kept current with a ResizeObserver; 0 × 0 where nothing is laid out (tests). */
export function useFit(element: RefObject<HTMLElement | null>): Fit {
  const [fit, setFit] = useState<Fit>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const target = element.current;
    if (!target) return;
    const measure = () => {
      setFit((previous) => (previous.width === target.clientWidth && previous.height === target.clientHeight ? previous : { width: target.clientWidth, height: target.clientHeight }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [element]);
  return fit;
}
