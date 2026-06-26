/** Editor object model + reducer with undo/redo, per the design spec (screen 7). */
export type ObjKind =
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'highlight'
  | 'redact'
  | 'ink'
  | 'stamp'
  | 'image';

export interface EditorObject {
  id: string;
  kind: ObjKind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
  // text
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  font?: 'Sans' | 'Serif' | 'Mono';
  // shapes / lines
  strokeWidth?: number;
  fill?: boolean;
  // stamp
  stampLabel?: string;
  // ink
  path?: string;
}

export interface ToolStyle {
  color: string;
  fontSize: number;
  font: 'Sans' | 'Serif' | 'Mono';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  shapeKind: 'rect' | 'ellipse' | 'line' | 'arrow';
  strokeWidth: number;
  fill: boolean;
  opacity: number;
}

export interface EditorState {
  objects: EditorObject[];
  selectedId: string | null;
  activeTool: string;
  style: ToolStyle;
  zoom: number;
  past: EditorObject[][];
  future: EditorObject[][];
}

export const PALETTE = ['#000000', '#ffffff', '#e5322d', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export const initialEditor: EditorState = {
  objects: [
    {id: 'o1', kind: 'text', x: 40, y: 60, w: 180, h: 30, color: '#0f1729', opacity: 1, text: 'Tap to edit text', fontSize: 18, align: 'left', font: 'Sans'},
    {id: 'o2', kind: 'stamp', x: 200, y: 360, w: 120, h: 44, color: '#22c55e', opacity: 1, stampLabel: 'APPROVED'},
  ],
  selectedId: null,
  activeTool: 'select',
  style: {
    color: '#e5322d',
    fontSize: 18,
    font: 'Sans',
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
    shapeKind: 'rect',
    strokeWidth: 2,
    fill: false,
    opacity: 1,
  },
  zoom: 1,
  past: [],
  future: [],
};

let nextId = 100;
function makeId() {
  return 'o' + nextId++;
}

export type EditorAction =
  | {type: 'setTool'; tool: string}
  | {type: 'select'; id: string | null}
  | {type: 'addAt'; kind: ObjKind; x: number; y: number}
  | {type: 'mutateSelected'; patch: Partial<EditorObject>}
  | {type: 'mutateStyle'; patch: Partial<ToolStyle>}
  | {type: 'nudge'; dx: number; dy: number}
  | {type: 'duplicate'}
  | {type: 'bringForward'}
  | {type: 'delete'; id?: string}
  | {type: 'undo'}
  | {type: 'redo'}
  | {type: 'zoom'; delta: number}
  | {type: 'addPage'};

function commit(state: EditorState, objects: EditorObject[], selectedId = state.selectedId): EditorState {
  return {...state, objects, selectedId, past: [...state.past, state.objects], future: []};
}

function defaultsFor(kind: ObjKind, x: number, y: number, s: ToolStyle): EditorObject {
  const base = {id: makeId(), kind, x, y, color: s.color, opacity: s.opacity} as EditorObject;
  switch (kind) {
    case 'text':
      return {...base, w: 160, h: 28, text: 'Text', fontSize: s.fontSize, bold: s.bold, italic: s.italic, underline: s.underline, align: s.align, font: s.font, color: s.color};
    case 'rect':
    case 'ellipse':
      return {...base, w: 120, h: 80, strokeWidth: s.strokeWidth, fill: s.fill};
    case 'line':
    case 'arrow':
      return {...base, w: 140, h: 0, strokeWidth: s.strokeWidth};
    case 'highlight':
      return {...base, w: 150, h: 20, color: '#eab308', opacity: 0.4};
    case 'redact':
      return {...base, w: 120, h: 26, color: '#000000', opacity: 1};
    case 'ink':
      return {...base, w: 120, h: 60, strokeWidth: s.strokeWidth, path: 'M0,40 C20,0 40,60 60,30 S100,10 120,40'};
    case 'stamp':
      return {...base, w: 120, h: 44, stampLabel: 'APPROVED', color: '#22c55e'};
    case 'image':
      return {...base, w: 120, h: 90};
    default:
      return {...base, w: 100, h: 40};
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setTool':
      return {...state, activeTool: action.tool, selectedId: action.tool === 'select' ? state.selectedId : null};
    case 'select':
      return {...state, selectedId: action.id};
    case 'addAt': {
      const obj = defaultsFor(action.kind, action.x, action.y, state.style);
      return commit(state, [...state.objects, obj], obj.id);
    }
    case 'mutateSelected': {
      if (!state.selectedId) return state;
      const objects = state.objects.map(o => (o.id === state.selectedId ? {...o, ...action.patch} : o));
      return commit(state, objects);
    }
    case 'mutateStyle':
      return {...state, style: {...state.style, ...action.patch}};
    case 'nudge': {
      if (!state.selectedId) return state;
      const objects = state.objects.map(o => (o.id === state.selectedId ? {...o, x: o.x + action.dx, y: o.y + action.dy} : o));
      return commit(state, objects);
    }
    case 'duplicate': {
      const sel = state.objects.find(o => o.id === state.selectedId);
      if (!sel) return state;
      const copy = {...sel, id: makeId(), x: sel.x + 16, y: sel.y + 16};
      return commit(state, [...state.objects, copy], copy.id);
    }
    case 'bringForward': {
      const idx = state.objects.findIndex(o => o.id === state.selectedId);
      if (idx < 0 || idx === state.objects.length - 1) return state;
      const objects = [...state.objects];
      const [item] = objects.splice(idx, 1);
      objects.push(item);
      return commit(state, objects);
    }
    case 'delete': {
      const id = action.id || state.selectedId;
      if (!id) return state;
      return commit(state, state.objects.filter(o => o.id !== id), null);
    }
    case 'undo': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {...state, objects: prev, past: state.past.slice(0, -1), future: [state.objects, ...state.future], selectedId: null};
    }
    case 'redo': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {...state, objects: next, past: [...state.past, state.objects], future: state.future.slice(1), selectedId: null};
    }
    case 'zoom':
      return {...state, zoom: Math.max(0.6, Math.min(1.6, +(state.zoom + action.delta).toFixed(2)))};
    case 'addPage':
      return state; // page model is single-canvas in this build
    default:
      return state;
  }
}
