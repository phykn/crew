import { useCallback, useLayoutEffect, useRef } from 'react';

// How near the bottom still counts as at it, so rounding and a line's slack do not unstick the list
const NEAR_PX = 40;
// The share of what is left each frame covers, so a long way starts fast and lands softly
const EASE = 0.22;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// A list that glides to its bottom as it grows, while the user is there, and stays put once they scroll up to read
export function useStickToBottom<T extends HTMLElement>(reset: unknown[]) {
  const ref = useRef<T>(null);
  const stuck = useRef(true);
  const frame = useRef<number | null>(null);
  // Where the glide last put the list, to tell its own scroll events from the user's
  const placed = useRef<number | null>(null);
  // The sizes the list had when last followed; a scroll event under other sizes came from content, not the user
  const size = useRef({ height: 0, content: 0 });

  const measure = (el: T) => {
    size.current = { height: el.clientHeight, content: el.scrollHeight };
  };
  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const glide = useCallback(() => {
    frame.current = null;
    const el = ref.current;
    if (!el || !stuck.current) return;
    const left = el.scrollHeight - el.clientHeight - el.scrollTop;
    const from = el.scrollTop;
    if (left >= 1) el.scrollTop = still() ? from + left : from + Math.max(1, left * EASE);
    placed.current = el.scrollTop;
    measure(el);
    // Stops at the bottom, or where the list cannot move any further
    if (el.scrollTop !== from && el.scrollHeight - el.clientHeight - el.scrollTop >= 1)
      frame.current = requestAnimationFrame(glide);
  }, []);

  const follow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    measure(el);
    if (stuck.current && frame.current === null) glide();
  }, [glide]);

  // Every row is watched, so streamed words, a picture that loads, or a row that opens all count as growth
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sizes = new ResizeObserver(follow);
    sizes.observe(el);
    for (const child of el.children) sizes.observe(child);
    const rows = new MutationObserver((changes) => {
      for (const change of changes) {
        for (const node of change.addedNodes) if (node instanceof Element) sizes.observe(node);
        for (const node of change.removedNodes) if (node instanceof Element) sizes.unobserve(node);
      }
    });
    rows.observe(el, { childList: true });
    return () => {
      sizes.disconnect();
      rows.disconnect();
      stop();
    };
  }, [follow]);

  // A new session or view starts at its bottom
  useLayoutEffect(() => {
    stuck.current = true;
    follow();
  }, reset);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (size.current.height !== el.clientHeight || size.current.content !== el.scrollHeight) return;
    if (placed.current !== null && Math.abs(el.scrollTop - placed.current) < 1) return;
    placed.current = null;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_PX;
    if (!stuck.current) stop();
  }, []);

  // What the user just did is shown, even if they had scrolled back to read
  const stick = useCallback(() => {
    stuck.current = true;
    follow();
  }, [follow]);
  // The user moved the list on purpose, as by opening a row, so it no longer follows
  const unstick = useCallback(() => {
    stuck.current = false;
    stop();
  }, []);

  return { ref, onScroll, stick, unstick };
}
