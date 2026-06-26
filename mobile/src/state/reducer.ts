import {AppState, Action, TabName} from './types';

export const TAB_ROOT: Record<TabName, string> = {
  home: 'home',
  tools: 'tools',
  files: 'files',
  settings: 'settings',
};

export const SEED_FILES = [
  {name: 'Lease Agreement.pdf', meta: '12 pages · 2h ago', accent: '#e5322d', seed: 0, tags: ['Recent'], pages: 12},
  {name: 'Invoice 0481.pdf', meta: '2 pages · Yesterday', accent: '#3b82f6', seed: 1, tags: ['Recent', 'Signed'], pages: 2},
  {name: 'Resume — A. Cole.pdf', meta: '1 page · Mon', accent: '#22c55e', seed: 2, tags: ['Recent', 'Starred'], pages: 1},
  {name: 'Q2 Report.pdf', meta: '34 pages · Apr 28', accent: '#f97316', seed: 0, tags: ['Recent'], pages: 34},
  {name: 'NDA — Final.pdf', meta: '4 pages · Apr 22', accent: '#8b5cf6', seed: 1, tags: ['Signed'], pages: 4},
  {name: 'Boarding Pass.pdf', meta: '1 page · Apr 20', accent: '#14b8a6', seed: 2, tags: ['Scanned'], pages: 1},
  {name: 'Tax Return 2025.pdf', meta: '18 pages · Apr 15', accent: '#ef4444', seed: 0, tags: ['Starred'], pages: 18},
  {name: 'Receipt — Cafe.pdf', meta: '1 page · Apr 11', accent: '#eab308', seed: 1, tags: ['Scanned'], pages: 1},
].map((f, i) => ({
  ...f,
  id: 'seed-' + i,
  starred: f.tags.includes('Starred'),
  uri: null as string | null,
}));

export const initialState: AppState = {
  dark: true,
  accent: 'red',
  toolLayout: 'grid',
  navStyle: 'fab',
  onboarded: false,
  tab: 'home',
  stack: [],
  files: SEED_FILES,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return {...state, ...action.payload};
    case 'setPref':
      return {...state, [action.key]: action.value};
    case 'navTab':
      // Switching tabs clears the pushed stack back to the tab root.
      return {...state, tab: action.tab, stack: []};
    case 'push':
      return {...state, stack: [...state.stack, action.entry]};
    case 'pop':
      return {...state, stack: state.stack.slice(0, -1)};
    case 'popToRoot':
      return {...state, stack: []};
    case 'addFile':
      return {...state, files: [action.file, ...state.files]};
    case 'updateFile':
      return {
        ...state,
        files: state.files.map(f => (f.id === action.id ? {...f, ...action.patch} : f)),
      };
    case 'deleteFile':
      return {...state, files: state.files.filter(f => f.id !== action.id)};
    case 'setFiles':
      return {...state, files: action.files};
    default:
      return state;
  }
}

/** Current screen = top of the pushed stack, or the active tab's root. */
export function currentScreen(state: AppState): string {
  if (state.stack.length > 0) return state.stack[state.stack.length - 1].screen;
  return TAB_ROOT[state.tab];
}

export function currentParams(state: AppState): any {
  if (state.stack.length > 0) return state.stack[state.stack.length - 1].params || {};
  return {};
}
