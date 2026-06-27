import React, {useReducer, useState} from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Svg, {Path, Line as SvgLine, Polygon} from 'react-native-svg';
import Icon from '../components/Icon';
import {BottomSheet} from '../components/Sheet';
import {useApp, useToast} from '../state/store';
import {editorReducer, initialEditor, PALETTE, EditorObject, ObjKind} from './editor/state';

const TOOLS = [
  {id: 'select', icon: 'select', label: 'Select'},
  {id: 'text', icon: 'text', label: 'Text'},
  {id: 'draw', icon: 'draw', label: 'Draw'},
  {id: 'shape', icon: 'shape', label: 'Shape'},
  {id: 'highlight', icon: 'highlight', label: 'Highlight'},
  {id: 'image', icon: 'image', label: 'Image'},
  {id: 'sign', icon: 'sign', label: 'Sign'},
  {id: 'stamp', icon: 'stamp', label: 'Stamp'},
  {id: 'redact', icon: 'redact', label: 'Redact'},
  {id: 'erase', icon: 'erase', label: 'Erase'},
];

function toolToKind(tool: string, shapeKind: string): ObjKind | null {
  switch (tool) {
    case 'text': return 'text';
    case 'draw': return 'ink';
    case 'sign': return 'ink';
    case 'shape': return shapeKind as ObjKind;
    case 'highlight': return 'highlight';
    case 'image': return 'image';
    case 'stamp': return 'stamp';
    case 'redact': return 'redact';
    default: return null;
  }
}

export default function EditPdf() {
  const t = useTheme() as AppTheme;
  const {back} = useApp();
  const {showToast} = useToast();
  const [st, dispatch] = useReducer(editorReducer, initialEditor);
  const [layers, setLayers] = useState(false);
  const selected = st.objects.find(o => o.id === st.selectedId) || null;

  const onCanvasPress = (e: any) => {
    const kind = toolToKind(st.activeTool, st.style.shapeKind);
    if (kind) {
      const {locationX, locationY} = e.nativeEvent;
      dispatch({type: 'addAt', kind, x: Math.max(8, locationX - 60), y: Math.max(8, locationY - 14)});
    } else if (st.activeTool === 'select') {
      dispatch({type: 'select', id: null});
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: t.pdf44.bg}}>
      {/* Compact header */}
      <View style={[styles.header, {borderBottomColor: t.pdf44.border}]}>
        <Pressable onPress={back} hitSlop={8} style={styles.hIcon}><Icon name="close" size={24} color={t.pdf44.text} /></Pressable>
        <Text style={{flex: 1, fontSize: 17, fontWeight: '700', color: t.pdf44.text}}>Edit PDF</Text>
        <Pressable onPress={() => { showToast('Preview only — saving edits back to the PDF isn’t available in this build yet', 'shield_check'); back(); }} style={[styles.done, {backgroundColor: t.pdf44.accent}]}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>Done</Text>
        </Pressable>
      </View>

      {/* Tool rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6, paddingHorizontal: 12, paddingVertical: 10}} style={{flexGrow: 0, backgroundColor: t.pdf44.bg2}}>
        {TOOLS.map(tool => {
          const active = st.activeTool === tool.id;
          return (
            <Pressable key={tool.id} onPress={() => dispatch({type: 'setTool', tool: tool.id})} style={[styles.railItem, active && {backgroundColor: t.pdf44.accentGlow}]}>
              <Icon name={tool.icon} size={20} color={active ? t.pdf44.accent : t.pdf44.text3} />
              <Text style={{fontSize: 10.5, color: active ? t.pdf44.accent : t.pdf44.text3, marginTop: 3, fontWeight: '600'}}>{tool.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Property bar */}
      <PropertyBar st={st} dispatch={dispatch} selected={selected} />

      {/* Canvas */}
      <ScrollView style={{flex: 1, backgroundColor: t.pdf44.bg3}} contentContainerStyle={{padding: 20, alignItems: 'center'}}>
        <Pressable onPress={onCanvasPress} style={[styles.canvas, {transform: [{scale: st.zoom}]}]}>
          {/* faint document text behind */}
          {Array.from({length: 16}).map((_, i) => (
            <View key={i} style={{position: 'absolute', left: 24, top: 30 + i * 22, height: 6, width: 240 - (i % 4) * 30, backgroundColor: '#eef0f5', borderRadius: 3}} />
          ))}
          {st.objects.map(o => (
            <EditorObjectView key={o.id} obj={o} selected={o.id === st.selectedId} onSelect={() => dispatch({type: 'select', id: o.id})} accent={t.pdf44.accent} />
          ))}
        </Pressable>
        {selected && <MiniBar dispatch={dispatch} />}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, {backgroundColor: t.pdf44.bg2, borderTopColor: t.pdf44.border}]}>
        <BarBtn icon="undo" disabled={!st.past.length} onPress={() => dispatch({type: 'undo'})} t={t} />
        <BarBtn icon="redo" disabled={!st.future.length} onPress={() => dispatch({type: 'redo'})} t={t} />
        <View style={styles.zoom}>
          <Pressable onPress={() => dispatch({type: 'zoom', delta: -0.1})} hitSlop={6}><Icon name="close" size={16} color={t.pdf44.text2} /></Pressable>
          <Text style={{color: t.pdf44.text2, fontSize: 12.5, fontWeight: '700', width: 44, textAlign: 'center'}}>{Math.round(st.zoom * 100)}%</Text>
          <Pressable onPress={() => dispatch({type: 'zoom', delta: 0.1})} hitSlop={6}><Icon name="plus" size={16} color={t.pdf44.text2} /></Pressable>
        </View>
        <Pressable onPress={() => setLayers(true)} style={styles.layersBtn}>
          <Icon name="layers" size={20} color={t.pdf44.text2} />
          <View style={[styles.badge, {backgroundColor: t.pdf44.accent}]}><Text style={{color: '#fff', fontSize: 10, fontWeight: '700'}}>{st.objects.length}</Text></View>
        </Pressable>
        <BarBtn icon="plus" onPress={() => { dispatch({type: 'addPage'}); showToast('Page added', 'page'); }} t={t} />
      </View>

      {/* Layers sheet */}
      <BottomSheet visible={layers} onClose={() => setLayers(false)}>
        <Text style={{fontSize: 16, fontWeight: '700', color: t.pdf44.text, paddingHorizontal: 16, paddingBottom: 8}}>Layers · {st.objects.length}</Text>
        <ScrollView style={{maxHeight: 320}}>
          {[...st.objects].reverse().map(o => (
            <Pressable key={o.id} onPress={() => { dispatch({type: 'select', id: o.id}); setLayers(false); }} style={[styles.layerRow, {borderBottomColor: t.pdf44.border}]}>
              <Icon name={kindIcon(o.kind)} size={18} color={t.pdf44.text2} />
              <Text style={{flex: 1, fontSize: 14.5, color: t.pdf44.text, textTransform: 'capitalize'}}>{o.kind}{o.kind === 'text' ? ` · "${(o.text || '').slice(0, 14)}"` : ''}</Text>
              <Pressable onPress={() => dispatch({type: 'delete', id: o.id})} hitSlop={8}><Icon name="trash" size={18} color={t.pdf44.error} /></Pressable>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{height: 20}} />
      </BottomSheet>
    </View>
  );
}

function kindIcon(kind: string): string {
  const m: Record<string, string> = {text: 'text', ink: 'draw', rect: 'shape', ellipse: 'shape', line: 'shape', arrow: 'shape', highlight: 'highlight', redact: 'redact', stamp: 'stamp', image: 'image'};
  return m[kind] || 'shape';
}

function BarBtn({icon, onPress, disabled, t}: any) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.barBtn, {opacity: disabled ? 0.35 : 1}]}>
      <Icon name={icon} size={22} color={t.pdf44.text2} />
    </Pressable>
  );
}

function EditorObjectView({obj, selected, onSelect, accent}: {obj: EditorObject; selected: boolean; onSelect: () => void; accent: string}) {
  const ring = selected ? {borderWidth: 1.5, borderColor: accent} : null;
  const common: any = {position: 'absolute', left: obj.x, top: obj.y, opacity: obj.opacity};
  let body: React.ReactNode = null;
  switch (obj.kind) {
    case 'text':
      body = (
        <Text style={{fontSize: obj.fontSize, color: obj.color, fontWeight: obj.bold ? '700' : '400', fontStyle: obj.italic ? 'italic' : 'normal', textDecorationLine: obj.underline ? 'underline' : 'none', textAlign: obj.align, fontFamily: obj.font === 'Mono' ? 'monospace' : obj.font === 'Serif' ? 'serif' : undefined}}>
          {obj.text}
        </Text>
      );
      break;
    case 'rect':
      body = <View style={{width: obj.w, height: obj.h, borderRadius: 4, borderWidth: obj.strokeWidth, borderColor: obj.color, backgroundColor: obj.fill ? obj.color : 'transparent'}} />;
      break;
    case 'ellipse':
      body = <View style={{width: obj.w, height: obj.h, borderRadius: Math.max(obj.w, obj.h), borderWidth: obj.strokeWidth, borderColor: obj.color, backgroundColor: obj.fill ? obj.color : 'transparent'}} />;
      break;
    case 'line':
      body = <View style={{width: obj.w, height: obj.strokeWidth, backgroundColor: obj.color}} />;
      break;
    case 'arrow':
      body = (
        <Svg width={obj.w} height={20}>
          <SvgLine x1={0} y1={10} x2={obj.w - 8} y2={10} stroke={obj.color} strokeWidth={obj.strokeWidth} />
          <Polygon points={`${obj.w - 12},4 ${obj.w},10 ${obj.w - 12},16`} fill={obj.color} />
        </Svg>
      );
      break;
    case 'highlight':
      body = <View style={{width: obj.w, height: obj.h, backgroundColor: obj.color}} />;
      break;
    case 'redact':
      body = <View style={{width: obj.w, height: obj.h, backgroundColor: '#000'}} />;
      break;
    case 'ink':
      body = (
        <Svg width={obj.w} height={obj.h}>
          <Path d={obj.path} stroke={obj.color} strokeWidth={obj.strokeWidth} fill="none" strokeLinecap="round" />
        </Svg>
      );
      break;
    case 'stamp':
      body = (
        <View style={{transform: [{rotate: '-8deg'}], borderWidth: 2, borderColor: obj.color, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5}}>
          <Text style={{color: obj.color, fontWeight: '800', fontSize: 15, letterSpacing: 1}}>{obj.stampLabel}</Text>
        </View>
      );
      break;
    case 'image':
      body = <View style={{width: obj.w, height: obj.h, backgroundColor: '#dfe3ea', borderRadius: 6, alignItems: 'center', justifyContent: 'center'}}><Icon name="image" size={26} color="#94a3b8" /></View>;
      break;
  }
  return (
    <Pressable onPress={onSelect} style={[common, ring, {padding: 2}]}>
      {body}
    </Pressable>
  );
}

function MiniBar({dispatch}: any) {
  const t = useTheme() as AppTheme;
  return (
    <View style={[styles.mini, {backgroundColor: t.pdf44.bgElev, borderColor: t.pdf44.border}]}>
      <Pressable onPress={() => dispatch({type: 'duplicate'})} style={styles.miniBtn}><Icon name="duplicate" size={18} color={t.pdf44.text2} /></Pressable>
      <Pressable onPress={() => dispatch({type: 'bringForward'})} style={styles.miniBtn}><Icon name="forward" size={18} color={t.pdf44.text2} /></Pressable>
      <Pressable onPress={() => dispatch({type: 'delete'})} style={styles.miniBtn}><Icon name="trash" size={18} color={t.pdf44.error} /></Pressable>
      <View style={{width: 1, height: 20, backgroundColor: t.pdf44.border, marginHorizontal: 2}} />
      {([['←', -8, 0], ['↑', 0, -8], ['↓', 0, 8], ['→', 8, 0]] as const).map(([s, dx, dy]) => (
        <Pressable key={s} onPress={() => dispatch({type: 'nudge', dx, dy})} style={styles.miniBtn}><Text style={{color: t.pdf44.text2, fontSize: 16}}>{s}</Text></Pressable>
      ))}
    </View>
  );
}

function PropertyBar({st, dispatch, selected}: any) {
  const t = useTheme() as AppTheme;
  const tool = st.activeTool;
  const target: EditorObject | null = selected;
  const isText = tool === 'text' || target?.kind === 'text';
  const isShape = tool === 'shape' || ['rect', 'ellipse', 'line', 'arrow'].includes(target?.kind || '');
  const showColor = !['image', 'redact'].includes(tool) && !['image', 'redact'].includes(target?.kind || '');

  const setProp = (patch: any) => {
    if (target) dispatch({type: 'mutateSelected', patch});
    dispatch({type: 'mutateStyle', patch});
  };

  if (tool === 'select' && !target) {
    return (
      <View style={[styles.propBar, {backgroundColor: t.pdf44.bg2}]}>
        <Text style={{color: t.pdf44.text3, fontSize: 13}}>Pick a tool, or tap an object to edit it</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.propBar, {backgroundColor: t.pdf44.bg2}]} contentContainerStyle={{alignItems: 'center', gap: 10, paddingHorizontal: 14}}>
      {isText && (
        <>
          <Segmented options={['Sans', 'Serif', 'Mono']} value={target?.font || st.style.font} onChange={(v: string) => setProp({font: v})} t={t} />
          <Stepper value={target?.fontSize || st.style.fontSize} onChange={(v: number) => setProp({fontSize: v})} t={t} />
          <Toggle label="B" active={!!(target?.bold ?? st.style.bold)} onPress={() => setProp({bold: !(target?.bold ?? st.style.bold)})} t={t} bold />
          <Toggle label="I" active={!!(target?.italic ?? st.style.italic)} onPress={() => setProp({italic: !(target?.italic ?? st.style.italic)})} t={t} italic />
          <Toggle label="U" active={!!(target?.underline ?? st.style.underline)} onPress={() => setProp({underline: !(target?.underline ?? st.style.underline)})} t={t} underline />
          {(['align-left', 'align-center', 'align-right'] as const).map(a => {
            const val = a.split('-')[1];
            const cur = target?.align || st.style.align;
            return <IconToggle key={a} icon={a} active={cur === val} onPress={() => setProp({align: val})} t={t} />;
          })}
        </>
      )}
      {isShape && (
        <>
          <Segmented options={['rect', 'ellipse', 'line', 'arrow']} value={target?.kind && ['rect', 'ellipse', 'line', 'arrow'].includes(target.kind) ? target.kind : st.style.shapeKind} onChange={(v: string) => dispatch({type: 'mutateStyle', patch: {shapeKind: v as any}})} t={t} />
          <Toggle label={target?.fill ?? st.style.fill ? 'Filled' : 'Outline'} active={!!(target?.fill ?? st.style.fill)} onPress={() => setProp({fill: !(target?.fill ?? st.style.fill)})} t={t} />
          {[1, 2, 4, 6].map(w => (
            <Pressable key={w} onPress={() => setProp({strokeWidth: w})} style={[styles.dot, {borderColor: (target?.strokeWidth ?? st.style.strokeWidth) === w ? t.pdf44.accent : t.pdf44.borderStrong}]}>
              <View style={{width: w + 2, height: w + 2, borderRadius: w, backgroundColor: t.pdf44.text2}} />
            </Pressable>
          ))}
        </>
      )}
      {showColor && PALETTE.map(c => (
        <Pressable key={c} onPress={() => setProp({color: c})} style={[styles.swatch, {backgroundColor: c, borderColor: (target?.color || st.style.color) === c ? t.pdf44.accent : t.pdf44.borderStrong}]} />
      ))}
      {target && (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Text style={{color: t.pdf44.text3, fontSize: 11}}>Opacity</Text>
          {[0.25, 0.5, 0.75, 1].map(op => (
            <Pressable key={op} onPress={() => setProp({opacity: op})} style={[styles.op, {borderColor: target.opacity === op ? t.pdf44.accent : t.pdf44.borderStrong}]}>
              <Text style={{fontSize: 10.5, color: t.pdf44.text2}}>{op * 100}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Segmented({options, value, onChange, t}: any) {
  return (
    <View style={[styles.seg, {borderColor: t.pdf44.borderStrong}]}>
      {options.map((o: string) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.segItem, value === o && {backgroundColor: t.pdf44.accentGlow}]}>
          <Text style={{fontSize: 12, fontWeight: '600', color: value === o ? t.pdf44.accent : t.pdf44.text3, textTransform: 'capitalize'}}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}
function Stepper({value, onChange, t}: any) {
  return (
    <View style={[styles.seg, {borderColor: t.pdf44.borderStrong}]}>
      <Pressable onPress={() => onChange(Math.max(8, value - 2))} style={styles.segItem}><Icon name="close" size={12} color={t.pdf44.text2} /></Pressable>
      <Text style={{fontSize: 12, fontWeight: '700', color: t.pdf44.text, width: 26, textAlign: 'center'}}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(72, value + 2))} style={styles.segItem}><Icon name="plus" size={12} color={t.pdf44.text2} /></Pressable>
    </View>
  );
}
function Toggle({label, active, onPress, t, bold, italic, underline}: any) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, {backgroundColor: active ? t.pdf44.accentGlow : 'transparent', borderColor: t.pdf44.borderStrong}]}>
      <Text style={{fontSize: 13, fontWeight: bold ? '800' : '600', fontStyle: italic ? 'italic' : 'normal', textDecorationLine: underline ? 'underline' : 'none', color: active ? t.pdf44.accent : t.pdf44.text2}}>{label}</Text>
    </Pressable>
  );
}
function IconToggle({icon, active, onPress, t}: any) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, {backgroundColor: active ? t.pdf44.accentGlow : 'transparent', borderColor: t.pdf44.borderStrong}]}>
      <Icon name={icon} size={16} color={active ? t.pdf44.accent : t.pdf44.text2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1},
  hIcon: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  done: {paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999},
  railItem: {alignItems: 'center', justifyContent: 'center', width: 58, height: 52, borderRadius: 12},
  propBar: {flexGrow: 0, minHeight: 50, maxHeight: 50, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'transparent', paddingVertical: 7},
  canvas: {width: 320, height: 440, backgroundColor: '#fff', borderRadius: 4, overflow: 'hidden'},
  seg: {flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden'},
  segItem: {paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center'},
  toggle: {width: 34, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  dot: {width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  swatch: {width: 26, height: 26, borderRadius: 13, borderWidth: 2},
  op: {paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1},
  mini: {flexDirection: 'row', alignItems: 'center', gap: 2, padding: 5, borderRadius: 12, borderWidth: 1, marginTop: 14},
  miniBtn: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8},
  bottomBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 60, borderTopWidth: 1},
  barBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  zoom: {flexDirection: 'row', alignItems: 'center', gap: 6},
  layersBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  badge: {position: 'absolute', top: 6, right: 4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3},
  layerRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1},
});
