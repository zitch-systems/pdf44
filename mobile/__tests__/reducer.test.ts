import {reducer, initialState, currentScreen, SEED_FILES} from '../src/state/reducer';
import {AppState, FileItem} from '../src/state/types';

const base: AppState = {...initialState, onboarded: true};

describe('navigation reducer', () => {
  test('push then current screen reflects top of stack', () => {
    const s = reducer(base, {type: 'push', entry: {screen: 'viewer', params: {name: 'x.pdf'}}});
    expect(currentScreen(s)).toBe('viewer');
  });

  test('pop returns to previous screen', () => {
    let s = reducer(base, {type: 'push', entry: {screen: 'viewer'}});
    s = reducer(s, {type: 'push', entry: {screen: 'edit'}});
    expect(currentScreen(s)).toBe('edit');
    s = reducer(s, {type: 'pop'});
    expect(currentScreen(s)).toBe('viewer');
  });

  test('switching tab clears the pushed stack to the tab root', () => {
    let s = reducer(base, {type: 'push', entry: {screen: 'viewer'}});
    s = reducer(s, {type: 'navTab', tab: 'files'});
    expect(s.stack).toHaveLength(0);
    expect(currentScreen(s)).toBe('files');
  });

  test('current screen is the active tab root when stack empty', () => {
    const s = reducer(base, {type: 'navTab', tab: 'tools'});
    expect(currentScreen(s)).toBe('tools');
  });
});

describe('files reducer', () => {
  test('addFile prepends', () => {
    const f: FileItem = {id: 'n1', name: 'New.pdf', meta: 'now', accent: '#fff', seed: 0, starred: false, tags: []};
    const s = reducer(base, {type: 'addFile', file: f});
    expect(s.files[0].id).toBe('n1');
    expect(s.files).toHaveLength(SEED_FILES.length + 1);
  });

  test('updateFile patches matching id', () => {
    const id = base.files[0].id;
    const s = reducer(base, {type: 'updateFile', id, patch: {starred: true}});
    expect(s.files.find(f => f.id === id)?.starred).toBe(true);
  });

  test('deleteFile removes', () => {
    const id = base.files[0].id;
    const s = reducer(base, {type: 'deleteFile', id});
    expect(s.files.find(f => f.id === id)).toBeUndefined();
  });
});

describe('prefs reducer', () => {
  test('setPref updates a single key', () => {
    const s = reducer(base, {type: 'setPref', key: 'dark', value: false});
    expect(s.dark).toBe(false);
  });
});
