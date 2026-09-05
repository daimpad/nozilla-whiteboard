import { useCallback, useEffect, useRef, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

/** Die Innenmaße eines Knotens beobachten — zurück kommen ein Ref und das Maß. */
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  Size,
  React.MutableRefObject<T | null>,
] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const setNode = useCallback((node: T | null) => {
    observer.current?.disconnect();
    ref.current = node;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize((previous) =>
        Math.abs(previous.width - rect.width) < 0.5 && Math.abs(previous.height - rect.height) < 0.5
          ? previous
          : { width: rect.width, height: rect.height },
      );
    };

    measure();
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(node);
    }
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  return [setNode, size, ref];
}
