import React, {useEffect, useState} from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar} from '../components/Chrome';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';
import {FileItem} from '../state/types';
import {readUriBytes, writePdf, pickPdfs, engineApi} from '../pdf/operations';

// One grid cell. `key` is a stable identity (survives reorder/duplicate so React
// keys and selection don't collide); `src` is the 0-based page in the source PDF
// (null = a blank inserted page); `rotation` is the extra rotation in degrees.
interface Slot {
  key: number;
  src: number | null;
  rotation: number;
}

let SLOT_SEQ = 1;
const slot = (src: number | null, rotation = 0): Slot => ({key: SLOT_SEQ++, src, rotation});

export default function Organize() {
  const t = useTheme() as AppTheme;
  const {params, back, go, addFile} = useApp();
  const {showToast} = useToast();

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [name, setName] = useState<string>(params?.name || 'document.pdf');
  const [pages, setPages] = useState<Slot[]>([]);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(!!params?.uri);
  const [busy, setBusy] = useState(false);

  async function load(uri: string, fileName: string) {
    setLoading(true);
    try {
      const b = await readUriBytes(uri);
      const count = await engineApi.pageCount(b);
      setBytes(b);
      setName(fileName);
      setPages(Array.from({length: count}, (_, i) => slot(i)));
      setSel(new Set());
    } catch {
      showToast('Could not open this PDF', 'close');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.uri) load(params.uri, params?.name || 'document.pdf');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async () => {
    try {
      const picks = await pickPdfs();
      if (picks.length) await load(picks[0].uri, picks[0].name);
    } catch (e: any) {
      if (e?.message !== 'cancelled') showToast(e?.message || 'Could not open file', 'close');
    }
  };

  const toggle = (key: number) =>
    setSel(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectAll = () => setSel(s => (s.size === pages.length ? new Set() : new Set(pages.map(p => p.key))));
  const after = (fn: (p: Slot[]) => Slot[], msg: string, icon: string) => { setPages(fn); setSel(new Set()); showToast(msg, icon); };

  const rotate = () => after(ps => ps.map(p => (sel.has(p.key) ? {...p, rotation: (p.rotation + 90) % 360} : p)), 'Rotated', 'rotate');
  const duplicate = () => after(ps => {
    const out: Slot[] = [];
    ps.forEach(p => { out.push(p); if (sel.has(p.key)) out.push(slot(p.src, p.rotation)); });
    return out;
  }, 'Duplicated', 'duplicate');
  const extract = () => after(ps => ps.filter(p => sel.has(p.key)), `Kept ${sel.size} page${sel.size === 1 ? '' : 's'}`, 'extract');
  const del = () => after(ps => ps.filter(p => !sel.has(p.key)), 'Deleted', 'trash');
  const addBlank = () => setPages(ps => [...ps, slot(null)]);

  const done = async () => {
    if (!bytes) { showToast('Open a PDF first', 'close'); return; }
    if (!pages.length) { showToast('Add at least one page first', 'close'); return; }
    setBusy(true);
    try {
      const ops = pages.map(p => ({src: p.src, rotation: p.rotation}));
      const outBytes = await engineApi.organizePdf(bytes, ops);
      const outName = name.replace(/\.pdf$/i, '') + '-organized.pdf';
      const uri = await writePdf(outBytes, outName);
      const count = await engineApi.pageCount(outBytes);
      const file: FileItem = {
        id: 'out-' + Date.now(),
        name: outName,
        meta: `${count} page${count === 1 ? '' : 's'} · just now`,
        accent: t.pdf44.accent,
        seed: 0,
        starred: false,
        tags: ['Recent'],
        uri,
        pages: count,
      };
      addFile(file);
      showToast('Saved organized PDF', 'check');
      go('viewer', file);
    } catch (e: any) {
      showToast(e?.message || 'Could not save the PDF', 'close');
    } finally {
      setBusy(false);
    }
  };

  const canSave = !!bytes && pages.length > 0 && !busy;

  return (
    <View style={{flex: 1}}>
      <TopAppBar
        title="Organize"
        subtitle={sel.size ? `${sel.size} selected` : `${pages.length} page${pages.length === 1 ? '' : 's'}`}
        onBack={back}
        actions={[
          {icon: 'check', label: 'Select all', onPress: selectAll},
          {icon: 'install', label: busy ? 'Saving…' : 'Done', primary: true, onPress: canSave ? done : () => {}},
        ]}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={t.pdf44.accent} /></View>
      ) : !bytes ? (
        <View style={styles.center}>
          <Icon name="organize" size={40} color={t.pdf44.text3} />
          <Text style={{color: t.pdf44.text2, marginTop: 12, marginBottom: 16, fontSize: 14.5}}>Open a PDF to reorder, rotate or delete pages</Text>
          <Pressable onPress={pick} style={[styles.pickBtn, {backgroundColor: t.pdf44.accent}]}>
            <Text style={{color: '#fff', fontWeight: '700'}}>Choose a PDF</Text>
          </Pressable>
          <Text style={{color: t.pdf44.text3, marginTop: 14, fontSize: 12}}>Runs entirely on your device</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {pages.map((p, i) => {
            const active = sel.has(p.key);
            return (
              <Pressable key={p.key} onPress={() => toggle(p.key)} style={styles.cell}>
                <View style={[styles.page, {borderColor: active ? t.pdf44.accent : t.pdf44.border, borderWidth: active ? 2 : 1, transform: [{rotate: `${p.rotation}deg`}]}]}>
                  <View style={{height: 6, backgroundColor: params?.accent || t.pdf44.accent}} />
                  {p.src === null ? (
                    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                      <Text style={{fontSize: 10, color: t.pdf44.text3}}>blank</Text>
                    </View>
                  ) : (
                    <View style={{padding: 8, gap: 5}}>
                      {Array.from({length: 5}).map((_, j) => <View key={j} style={{height: 3, backgroundColor: '#e7e9ef', borderRadius: 2, width: `${85 - j * 8}%`}} />)}
                    </View>
                  )}
                </View>
                {active && <View style={[styles.checkBadge, {backgroundColor: t.pdf44.accent}]}><Icon name="check" size={12} color="#fff" /></View>}
                <Text style={{fontSize: 11, color: t.pdf44.text3, marginTop: 4}}>{i + 1}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={addBlank} style={styles.cell}>
            <View style={[styles.addPage, {borderColor: t.pdf44.borderStrong}]}>
              <Icon name="plus" size={26} color={t.pdf44.text3} />
            </View>
            <Text style={{fontSize: 11, color: t.pdf44.text3, marginTop: 4}}>Add blank</Text>
          </Pressable>
        </ScrollView>
      )}

      {sel.size > 0 && (
        <View style={[styles.contextBar, {backgroundColor: t.pdf44.bg2, borderTopColor: t.pdf44.border}]}>
          {[['rotate', 'Rotate', rotate], ['duplicate', 'Duplicate', duplicate], ['extract', 'Extract', extract], ['trash', 'Delete', del]].map(([icon, label, fn]: any) => (
            <Pressable key={label} onPress={fn} style={styles.ctx}>
              <Icon name={icon} size={22} color={label === 'Delete' ? t.pdf44.error : t.pdf44.text2} />
              <Text style={{fontSize: 11, marginTop: 4, fontWeight: '600', color: label === 'Delete' ? t.pdf44.error : t.pdf44.text3}}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  pickBtn: {paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12},
  grid: {flexDirection: 'row', flexWrap: 'wrap', padding: 14, paddingBottom: 110},
  cell: {width: '33.33%', alignItems: 'center', paddingVertical: 10},
  page: {width: 84, height: 110, backgroundColor: '#fff', borderRadius: 5, overflow: 'hidden'},
  checkBadge: {position: 'absolute', top: 6, right: 18, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  addPage: {width: 84, height: 110, borderRadius: 5, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'},
  contextBar: {position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', height: 72, borderTopWidth: 1, paddingTop: 8},
  ctx: {alignItems: 'center', justifyContent: 'center', flex: 1},
});
