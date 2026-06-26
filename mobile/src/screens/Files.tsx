import React, {useState} from 'react';
import {View, Text} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar, Chip, Body, ChipRow} from '../components/Chrome';
import {FileRow, DocThumb} from '../components/Files';
import {ActionSheet} from '../components/Sheet';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';
import {FileItem} from '../state/types';

const FILTERS = ['All', 'Recent', 'Scanned', 'Signed', 'Starred'];

export default function Files() {
  const t = useTheme() as AppTheme;
  const {state, go, updateFile, deleteFile} = useApp();
  const {showToast} = useToast();
  const [filter, setFilter] = useState('All');
  const [menu, setMenu] = useState<FileItem | null>(null);

  const shown = state.files.filter(f => {
    if (filter === 'All') return true;
    if (filter === 'Starred') return f.starred;
    return (f.tags || []).includes(filter);
  });

  const toggleStar = (f: FileItem) => {
    const next = !f.starred;
    updateFile(f.id, {
      starred: next,
      tags: next ? Array.from(new Set([...(f.tags || []), 'Starred'])) : (f.tags || []).filter(x => x !== 'Starred'),
    });
    showToast(next ? 'Starred ' + f.name : 'Removed star', 'star');
  };
  const del = (f: FileItem) => {
    deleteFile(f.id);
    showToast('Deleted ' + f.name, 'trash');
  };

  return (
    <View style={{flex: 1}}>
      <TopAppBar
        title="Files"
        subtitle="Stored only on this device"
        large
        actions={[
          {icon: 'jpg2pdf', label: 'Import', onPress: () => showToast('Pick a file to import', 'jpg2pdf')},
          {icon: 'scan', label: 'Scan', primary: true, onPress: () => go('scan')},
        ]}
      />
      <Body contentStyle={{paddingBottom: 120}}>
        <ChipRow>
          {FILTERS.map(c => (
            <Chip key={c} label={c} selected={filter === c} onPress={() => setFilter(c)} />
          ))}
        </ChipRow>
        {shown.length === 0 && (
          <View style={{alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30}}>
            <Icon name="extract" size={36} color={t.pdf44.text3} />
            <Text style={{fontSize: 14.5, fontWeight: '600', color: t.pdf44.text2, marginTop: 10}}>No {filter.toLowerCase()} files</Text>
          </View>
        )}
        {shown.map((f, i) => (
          <View key={f.id}>
            <FileRow {...f} onPress={() => go('viewer', f)} onMore={() => setMenu(f)} />
            {i < shown.length - 1 && <View style={{height: 1, backgroundColor: t.pdf44.border, marginLeft: 80, marginRight: 22}} />}
          </View>
        ))}
      </Body>
      <ActionSheet
        visible={!!menu}
        onClose={() => setMenu(null)}
        header={
          menu ? (
            <>
              <DocThumb w={38} accent={menu.accent} seed={menu.seed} />
              <View>
                <Text style={{fontSize: 14.5, fontWeight: '700', color: t.pdf44.text}}>{menu.name}</Text>
                <Text style={{fontSize: 12, color: t.pdf44.text3, marginTop: 2}}>{menu.meta}</Text>
              </View>
            </>
          ) : null
        }
        items={
          menu
            ? [
                {icon: 'eye', label: 'Open', onPress: () => go('viewer', menu)},
                {icon: 'install', label: 'Share / Export', onPress: () => showToast('Sharing ' + menu.name, 'share')},
                {icon: menu.starred ? 'star-filled' : 'star', label: menu.starred ? 'Remove star' : 'Add star', onPress: () => toggleStar(menu)},
                {icon: 'edit', label: 'Rename', onPress: () => showToast('Rename ' + menu.name, 'edit')},
                {icon: 'trash', label: 'Delete', danger: true, onPress: () => del(menu)},
              ]
            : []
        }
      />
    </View>
  );
}
