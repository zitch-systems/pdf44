import {ALL, FLAT_TOOLS, QUICK, POPULAR, routeFor, TOOL_CATEGORIES} from '../src/data/tools';
import {editorReducer, initialEditor} from '../src/screens/editor/state';
import {isReal, REAL_TOOLS} from '../src/pdf/registry';

describe('tool catalog', () => {
  test('flattens every category item', () => {
    const count = ALL.reduce((a, g) => a + g.items.length, 0);
    expect(FLAT_TOOLS).toHaveLength(count);
  });

  test('categories list begins with All', () => {
    expect(TOOL_CATEGORIES[0]).toBe('All');
    expect(TOOL_CATEGORIES).toContain('Convert');
    expect(TOOL_CATEGORIES).toContain('Optimize & secure');
  });

  test('routeFor maps fill/sign variants to the fillsign engine', () => {
    expect(routeFor('fillpdf')).toBe('fillsign');
    expect(routeFor('signpdf')).toBe('fillsign');
    expect(routeFor('fillsign')).toBe('fillsign');
    expect(routeFor('edit')).toBe('edit');
    expect(routeFor('scan')).toBe('scan');
    expect(routeFor('merge')).toBe('tool');
  });

  test('quick and popular reference real tool ids', () => {
    const ids = new Set(FLAT_TOOLS.map(t => t.id).concat(['scan']));
    for (const q of [...QUICK, ...POPULAR]) expect(ids.has(q.id)).toBe(true);
  });
});

describe('real-op registry', () => {
  test('isReal reflects the REAL_TOOLS set', () => {
    expect(isReal('merge')).toBe(true);
    expect(isReal('jpg2pdf')).toBe(true);
    expect(isReal('ocr')).toBe(false);
    expect(REAL_TOOLS.has('watermark')).toBe(true);
  });
});

describe('editor reducer', () => {
  test('addAt inserts and selects a new object', () => {
    const s = editorReducer(initialEditor, {type: 'addAt', kind: 'rect', x: 10, y: 10});
    expect(s.objects.length).toBe(initialEditor.objects.length + 1);
    expect(s.selectedId).toBe(s.objects[s.objects.length - 1].id);
  });

  test('undo/redo restores object list', () => {
    let s = editorReducer(initialEditor, {type: 'addAt', kind: 'text', x: 0, y: 0});
    const afterAdd = s.objects.length;
    s = editorReducer(s, {type: 'undo'});
    expect(s.objects.length).toBe(afterAdd - 1);
    s = editorReducer(s, {type: 'redo'});
    expect(s.objects.length).toBe(afterAdd);
  });

  test('delete removes the selected object', () => {
    let s = editorReducer(initialEditor, {type: 'addAt', kind: 'rect', x: 0, y: 0});
    const id = s.selectedId!;
    s = editorReducer(s, {type: 'delete'});
    expect(s.objects.find(o => o.id === id)).toBeUndefined();
    expect(s.selectedId).toBeNull();
  });

  test('nudge moves the selected object', () => {
    let s = editorReducer(initialEditor, {type: 'addAt', kind: 'rect', x: 50, y: 50});
    const before = s.objects.find(o => o.id === s.selectedId)!;
    s = editorReducer(s, {type: 'nudge', dx: 8, dy: -8});
    const after = s.objects.find(o => o.id === before.id)!;
    expect(after.x).toBe(before.x + 8);
    expect(after.y).toBe(before.y - 8);
  });

  test('zoom clamps to range', () => {
    let s = editorReducer(initialEditor, {type: 'zoom', delta: 5});
    expect(s.zoom).toBeLessThanOrEqual(1.6);
    s = editorReducer(initialEditor, {type: 'zoom', delta: -5});
    expect(s.zoom).toBeGreaterThanOrEqual(0.6);
  });
});
