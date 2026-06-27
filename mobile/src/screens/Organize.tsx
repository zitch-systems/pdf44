import React, {useState} from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar} from '../components/Chrome';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';

interface Page {
  id: number;
  rotation: number;
}

export default function Organize() {
  const t = useTheme() as AppTheme;
  const {params, back} = useApp();
  const {showToast} = useToast();
  const total = params?.pages || 8;
  const [pages, setPages] = useState<Page[]>(() => Array.from({length: total}, (_, i) => ({id: i + 1, rotation: 0})));
  const [sel, setSel] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setSel(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const selectAll = () => setSel(s => (s.size === pages.length ? new Set() : new Set(pages.map(p => p.id))));
  const mutate = (fn: (p: Page[]) => Page[], msg: string, icon: string) => {
    setPages(fn);
    setSel(new Set());
    showToast(msg, icon);
  };
  const rotate = () => mutate(ps => ps.map(p => (sel.has(p.id) ? {...p, rotation: (p.rotation + 90) % 360} : p)), 'Rotated pages', 'rotate');
  const duplicate = () => mutate(ps => {
    const out: Page[] = [];
    ps.forEach(p => { out.push(p); if (sel.has(p.id)) out.push({...p, id: Math.max(...ps.map(x => x.id)) + out.length}); });
    return out;
  }, 'Duplicated pages', 'duplicate');
  const extract = () => mutate(ps => ps.filter(p => sel.has(p.id)), 'Extracted ' + sel.size + ' pages', 'extract');
  const del = () => mutate(ps => ps.filter(p => !sel.has(p.id)), 'Deleted pages', 'trash');

  return (
    <View style={{flex: 1}}>
      <TopAppBar
        title="Organize"
        subtitle={sel.size ? `${sel.size} selected` : `${pages.length} pages`}
        onBack={back}
        actions={[
          {icon: 'check', label: 'Select all', onPress: selectAll},
          {icon: 'install', label: 'Done', primary: true, onPress: () => { showToast('Preview only — saving the new page order isn’t available in this build yet', 'shield_check'); back(); }},
        ]}
      />
      <ScrollView contentContainerStyle={styles.grid}>
        {pages.map(p => {
          const active = sel.has(p.id);
          return (
            <Pressable key={p.id} onPress={() => toggle(p.id)} style={styles.cell}>
              <View style={[styles.page, {borderColor: active ? t.pdf44.accent : t.pdf44.border, borderWidth: active ? 2 : 1, transform: [{rotate: `${p.rotation}deg`}]}]}>
                <View style={{height: 6, backgroundColor: params?.accent || t.pdf44.accent}} />
                <View style={{padding: 8, gap: 5}}>
                  {Array.from({length: 5}).map((_, i) => <View key={i} style={{height: 3, backgroundColor: '#e7e9ef', borderRadius: 2, width: `${85 - i * 8}%`}} />)}
                </View>
              </View>
              {active && <View style={[styles.checkBadge, {backgroundColor: t.pdf44.accent}]}><Icon name="check" size={12} color="#fff" /></View>}
              <Text style={{fontSize: 11, color: t.pdf44.text3, marginTop: 4}}>{p.id}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setPages(ps => [...ps, {id: Math.max(0, ...ps.map(p => p.id)) + 1, rotation: 0}])} style={styles.cell}>
          <View style={[styles.addPage, {borderColor: t.pdf44.borderStrong}]}>
            <Icon name="plus" size={26} color={t.pdf44.text3} />
          </View>
          <Text style={{fontSize: 11, color: t.pdf44.text3, marginTop: 4}}>Add</Text>
        </Pressable>
      </ScrollView>

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
  grid: {flexDirection: 'row', flexWrap: 'wrap', padding: 14, paddingBottom: 110},
  cell: {width: '33.33%', alignItems: 'center', paddingVertical: 10},
  page: {width: 84, height: 110, backgroundColor: '#fff', borderRadius: 5, overflow: 'hidden'},
  checkBadge: {position: 'absolute', top: 6, right: 18, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  addPage: {width: 84, height: 110, borderRadius: 5, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'},
  contextBar: {position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', height: 72, borderTopWidth: 1, paddingTop: 8},
  ctx: {alignItems: 'center', justifyContent: 'center', flex: 1},
});
