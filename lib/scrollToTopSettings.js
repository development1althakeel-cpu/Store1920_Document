export const SCROLL_TO_TOP_POSITIONS = ['right', 'left'];

export const DEFAULT_SCROLL_TO_TOP = {
  enabled: true,
  position: 'right',
};

export function normalizeScrollToTop(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const position = SCROLL_TO_TOP_POSITIONS.includes(source.position)
    ? source.position
    : DEFAULT_SCROLL_TO_TOP.position;

  return {
    enabled: source.enabled !== false,
    position,
  };
}
