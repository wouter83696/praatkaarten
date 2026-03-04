// Praatkaartjes – viewer templates registry

export const viewer = {
  classic: { name: 'classic' },
  compact: { name: 'compact' },
};

export function resolveViewer(name) {
  const key = String(name || 'classic');
  return viewer[key] || viewer.classic;
}
