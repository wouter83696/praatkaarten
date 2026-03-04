// Praatkaartjes – eenvoudige state
// Één bron van waarheid voor actieve set/thema.

export const state = {
  activeSet: '',
  activeTheme: '',
};

export function setActiveSet(setId) {
  state.activeSet = String(setId || '').trim();
}

export function setActiveTheme(themeKey) {
  state.activeTheme = String(themeKey || '').trim();
}
