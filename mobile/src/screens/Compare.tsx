import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTheme, Button} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar, Body} from '../components/Chrome';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';

function Slot({label, file, onPick, t}: any) {
  return (
    <Pressable onPress={onPick} style={[styles.slot, {borderColor: file ? t.pdf44.accent : t.pdf44.borderStrong, backgroundColor: t.pdf44.bg2}]}>
      <Text style={{fontSize: 11.5, fontWeight: '700', color: t.pdf44.text3, textTransform: 'uppercase', letterSpacing: 0.6}}>{label}</Text>
      {file ? (
        <Text style={{fontSize: 14.5, fontWeight: '600', color: t.pdf44.text, marginTop: 6}}>{file}</Text>
      ) : (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6}}>
          <Icon name="jpg2pdf" size={20} color={t.pdf44.accent} />
          <Text style={{fontSize: 14, color: t.pdf44.text3}}>Choose a file</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function Compare() {
  const t = useTheme() as AppTheme;
  const {back} = useApp();
  const {showToast} = useToast();
  const [a, setA] = useState<string | null>('Contract v1.pdf');
  const [b, setB] = useState<string | null>('Contract v2.pdf');
  const [result, setResult] = useState(false);

  const stats = [
    {label: 'Added', value: 12, color: t.pdf44.success, sign: '+'},
    {label: 'Removed', value: 5, color: t.pdf44.error, sign: '−'},
    {label: 'Modified', value: 8, color: t.pdf44.warning, sign: '~'},
  ];

  return (
    <View style={{flex: 1}}>
      <TopAppBar title="Compare files" large onBack={back} />
      <Body contentStyle={{padding: 18, paddingBottom: 60}}>
        <Slot label="Original" file={a} onPick={() => setA('Contract v1.pdf')} t={t} />
        <Pressable onPress={() => { const tmp = a; setA(b); setB(tmp); }} style={styles.swap}>
          <View style={[styles.swapBtn, {backgroundColor: t.pdf44.bg3, borderColor: t.pdf44.border}]}>
            <Icon name="swap" size={20} color={t.pdf44.text2} />
          </View>
        </Pressable>
        <Slot label="Revised" file={b} onPick={() => setB('Contract v2.pdf')} t={t} />

        <Button mode="contained" onPress={() => { setResult(true); showToast('Preview only — real file diff isn’t available in this build yet', 'shield_check'); }} disabled={!a || !b} contentStyle={{height: 50}} style={{borderRadius: 14, marginTop: 18}} labelStyle={{fontWeight: '700', fontSize: 15.5}}>
          Compare
        </Button>

        {result && (
          <View style={{marginTop: 24}}>
            <View style={{flexDirection: 'row', gap: 10}}>
              {stats.map(s => (
                <View key={s.label} style={[styles.stat, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border}]}>
                  <Text style={{fontSize: 24, fontWeight: '800', color: s.color}}>{s.sign}{s.value}</Text>
                  <Text style={{fontSize: 12, color: t.pdf44.text3, marginTop: 2}}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{fontSize: 15, fontWeight: '700', color: t.pdf44.text, marginTop: 22, marginBottom: 12}}>Side by side</Text>
            <View style={{flexDirection: 'row', gap: 12}}>
              {[a, b].map((name, side) => (
                <View key={side} style={[styles.diffPage, {borderColor: t.pdf44.border}]}>
                  <View style={{height: 6, backgroundColor: t.pdf44.accent}} />
                  <View style={{padding: 10, gap: 7}}>
                    {[0, 1, 2, 3, 4, 5].map(i => {
                      const kind = side === 0 ? (i === 2 ? 'del' : i === 4 ? 'mod' : 'same') : i === 2 ? 'add' : i === 4 ? 'mod' : 'same';
                      const bg = kind === 'add' ? 'rgba(34,197,94,0.25)' : kind === 'del' ? 'rgba(239,68,68,0.25)' : kind === 'mod' ? 'rgba(245,158,11,0.25)' : 'transparent';
                      return <View key={i} style={{backgroundColor: bg, borderRadius: 3, paddingVertical: 2}}><View style={{height: 6, backgroundColor: '#e7e9ef', borderRadius: 3, width: `${88 - (i % 3) * 12}%`}} /></View>;
                    })}
                  </View>
                </View>
              ))}
            </View>
            <Button mode="outlined" onPress={() => showToast('The diff above is an illustrative sample — exporting isn’t available yet', 'shield_check')} style={{borderRadius: 12, marginTop: 18}} textColor={t.pdf44.accent}>
              Export report
            </Button>
          </View>
        )}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {borderWidth: 2, borderRadius: 16, padding: 18, borderStyle: 'dashed'},
  swap: {alignItems: 'center', marginVertical: -12, zIndex: 1},
  swapBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1},
  stat: {flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1},
  diffPage: {flex: 1, backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', borderWidth: 1},
});
