import React, {useRef, useState, useEffect} from 'react';
import {View, Text, TextInput, Pressable, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {SectionHeader, Chip, Body} from '../components/Chrome';
import {ToolRow} from '../components/Tool';
import {FileRow} from '../components/Files';
import Icon from '../components/Icon';
import {useApp} from '../state/store';
import {FLAT_TOOLS} from '../data/tools';
import {openTool} from './Home';
import {RECENTS} from './Home';

const SUGGESTIONS = ['Merge', 'Compress', 'Sign', 'Scan', 'PDF to Word', 'Protect'];

export default function Search() {
  const t = useTheme() as AppTheme;
  const {go, back} = useApp();
  const [q, setQ] = useState('');
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(id);
  }, []);

  const ql = q.trim().toLowerCase();
  const toolHits = ql ? FLAT_TOOLS.filter(x => (x.title + ' ' + (x.desc || '')).toLowerCase().includes(ql)).slice(0, 6) : [];
  const fileHits = ql ? RECENTS.filter(f => f.name.toLowerCase().includes(ql)) : [];

  return (
    <View style={{flex: 1}}>
      <View style={[styles.field, {backgroundColor: t.pdf44.bg3}]}>
        <Pressable onPress={back} hitSlop={8} style={styles.iconBtn}>
          <Icon name="back" size={22} color={t.pdf44.text2} />
        </Pressable>
        <TextInput
          ref={inputRef}
          value={q}
          onChangeText={setQ}
          placeholder="Search tools & files"
          placeholderTextColor={t.pdf44.text3}
          style={{flex: 1, fontSize: 16, color: t.pdf44.text, paddingVertical: 0}}
        />
        {!!q && (
          <Pressable onPress={() => setQ('')} hitSlop={8} style={styles.iconBtn}>
            <Icon name="close" size={18} color={t.pdf44.text3} />
          </Pressable>
        )}
      </View>
      <Body contentStyle={{paddingBottom: 40}}>
        {!ql && (
          <View>
            <SectionHeader title="Suggested" />
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22, paddingBottom: 8}}>
              {SUGGESTIONS.map(s => (
                <Chip key={s} label={s} icon="cmd" onPress={() => setQ(s)} />
              ))}
            </View>
            <SectionHeader title="Recent files" />
            {RECENTS.map((f, i) => (
              <FileRow key={i} {...f} onPress={() => go('viewer', f)} />
            ))}
          </View>
        )}
        {!!ql && toolHits.length > 0 && (
          <View>
            <SectionHeader title="Tools" />
            <View style={{paddingHorizontal: 12}}>
              {toolHits.map(tool => (
                <ToolRow key={tool.id} icon={tool.icon} color={tool.color} title={tool.title} desc={tool.desc} onPress={() => openTool(go, tool)} />
              ))}
            </View>
          </View>
        )}
        {!!ql && fileHits.length > 0 && (
          <View>
            <SectionHeader title="Files" />
            {fileHits.map((f, i) => (
              <FileRow key={i} {...f} onPress={() => go('viewer', f)} />
            ))}
          </View>
        )}
        {!!ql && toolHits.length === 0 && fileHits.length === 0 && (
          <View style={{alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30}}>
            <Icon name="extract" size={40} color={t.pdf44.text3} />
            <Text style={{fontSize: 15, fontWeight: '600', color: t.pdf44.text2, marginTop: 12}}>No results for "{q}"</Text>
            <Text style={{fontSize: 13, color: t.pdf44.text3, marginTop: 4}}>Try a tool name like Merge or Compress</Text>
          </View>
        )}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {flexDirection: 'row', alignItems: 'center', gap: 6, height: 56, borderRadius: 28, paddingHorizontal: 10, marginHorizontal: 14, marginTop: 8},
  iconBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
});
