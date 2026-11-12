import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ChartTooltip({
  anchor,
  text,
  id,
  onDismiss,
}: {
  anchor: Element | null;
  text: string;
  id: string;
  onDismiss: () => void;
}) {
  const tooltip = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor || !tooltip.current) return;
    const boundary = anchor.closest('.metric-card, .health-chart') || anchor.parentElement!;
    const place = () => {
      const node = tooltip.current;
      if (!node || !anchor.isConnected) return;
      const card = boundary.getBoundingClientRect();
      const point = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = Math.max(card.left, viewport?.offsetLeft ?? 0) + 8;
      const rightEdge =
        Math.min(
          card.right,
          (viewport?.offsetLeft ?? 0) + (viewport?.width ?? document.documentElement.clientWidth),
        ) - 8;
      const topEdge = Math.max(card.top, viewport?.offsetTop ?? 0) + 8;
      const bottomEdge =
        Math.min(
          card.bottom,
          (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
        ) - 8;
      if (
        rightEdge <= leftEdge ||
        bottomEdge <= topEdge ||
        point.bottom < topEdge ||
        point.top > bottomEdge
      ) {
        setPosition(null);
        return;
      }
      node.style.maxWidth = `${Math.min(260, Math.max(1, rightEdge - leftEdge))}px`;
      node.style.maxHeight = `${bottomEdge - topEdge}px`;
      const box = node.getBoundingClientRect();
      const left = Math.max(
        leftEdge,
        Math.min(point.left + point.width / 2, rightEdge - box.width),
      );
      const preferredTop =
        point.top - box.height - 8 >= topEdge ? point.top - box.height - 8 : point.bottom + 8;
      const top = Math.max(topEdge, Math.min(preferredTop, bottomEdge - box.height));
      setPosition((old) => (old?.left === left && old.top === top ? old : { left, top }));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(boundary);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchor, text, onDismiss]);
  if (!anchor) return null;
  return createPortal(
    <div
      ref={tooltip}
      id={id}
      role="tooltip"
      className="chart-tooltip"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      {text}
    </div>,
    document.body,
  );
}
