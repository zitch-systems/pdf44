import React, {useState} from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar} from '../components/Chrome';
import {BottomSheet} from '../components/Sheet';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';

const ACTIONS = [
  {icon: 'edit', label: 'Edit', screen: 'edit'},
  {icon: 'comment', label: 'Comment', screen: 'comment'},
  {icon: 'sign', label: 'Sign', screen: 'fillsign', mode: 'sign'},
  {icon: 'organize', label: 'Pages', screen: 'organize'},
  {icon: 'install', label: 'Export', screen: null},
];

function PaperPage({accent, reading}: {accent: string; reading?: boolean}) {
  const t = useTheme() as AppTheme;
  if (reading) {
    return (
      <View style={{paddingHorizontal: 24, paddingTop: 16}}>
        <Text style={{fontSize: 22, fontWeight: '800', color: t.pdf44.text, marginBottom: 14}}>Lease Agreement</Text>
        {Array.from({length: 9}).map((_, i) => (
          <View key={i} style={{height: 9, borderRadius: 5, backgroundColor: t.pdf44.bg3, marginBottom: 12, width: `${88 - (i % 3) * 12}%`}} />
        ))}
        <Text style={{fontSize: 17, fontWeight: '700', color: t.pdf44.text, marginVertical: 12}}>1. Term</Text>
        {Array.from({length: 6}).map((_, i) => (
          <View key={i} style={{height: 9, borderRadius: 5, backgroundColor: t.pdf44.bg3, marginBottom: 12, width: `${90 - (i % 2) * 18}%`}} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.paper}>
      <View style={{height: 8, backgroundColor: accent}} />
      <View style={{padding: 22}}>
        <View style={{height: 14, width: '55%', backgroundColor: '#e7e9ef', borderRadius: 4, marginBottom: 18}} />
        {Array.from({length: 14}).map((_, i) => (
          <View key={i} style={{height: 7, borderRadius: 4, backgroundColor: '#eef0f5', marginBottom: 10, width: `${94 - (i % 4) * 11}%`}} />
        ))}
      </View>
    </View>
  );
}

export default function Viewer() {
  const t = useTheme() as AppTheme;
  const {params, back, go} = useApp();
  const {showToast} = useToast();
  const [reading, setReading] = useState(false);
  const [thumbs, setThumbs] = useState(false);
  const [page, setPage] = useState(1);
  const total = params?.pages || 12;
  const accent = params?.accent || t.pdf44.accent;
  const name = params?.name || 'Document.pdf';

  return (
    <View style={{flex: 1}}>
      <TopAppBar
        title={name}
        subtitle={`Page ${page} of ${total}`}
        onBack={back}
        actions={[
          {icon: 'thumbnails', label: 'Thumbnails', onPress: () => setThumbs(true)},
          {icon: 'reading', label: 'Reading mode', onPress: () => setReading(r => !r)},
          {icon: 'share', label: 'Share', onPress: () => showToast('Sharing ' + name, 'share')},
        ]}
      />
      <ScrollView
        style={{flex: 1, backgroundColor: reading ? t.pdf44.bg : t.pdf44.bg3}}
        contentContainerStyle={{padding: reading ? 0 : 20, paddingBottom: 120, alignItems: 'center'}}
        onScroll={e => {
          const y = e.nativeEvent.contentOffset.y;
          setPage(Math.min(total, Math.max(1, Math.floor(y / 380) + 1)));
        }}
        scrollEventThrottle={64}>
        <PaperPage accent={accent} reading={reading} />
        {!reading && (
          <View style={{opacity: 0.5, marginTop: 16}}>
            <PaperPage accent={accent} />
          </View>
        )}
      </ScrollView>

      {!reading && (
        <View style={[styles.pagePill, {backgroundColor: t.pdf44.bgElev, borderColor: t.pdf44.border}]}>
          <Text style={{color: t.pdf44.text, fontSize: 12.5, fontWeight: '700'}}>
            {page} / {total}
          </Text>
        </View>
      )}

      {/* Bottom action bar */}
      <View style={[styles.actionBar, {backgroundColor: t.pdf44.bg2, borderTopColor: t.pdf44.border}]}>
        {ACTIONS.map(a => (
          <Pressable
            key={a.label}
            onPress={() => (a.screen ? go(a.screen, {...params, mode: a.mode}) : showToast('Exported ' + name, 'install'))}
            android_ripple={{color: t.pdf44.bgGlass, borderless: true, radius: 36}}
            style={styles.action}>
            <Icon name={a.icon} size={22} color={t.pdf44.text2} />
            <Text style={{fontSize: 11, color: t.pdf44.text3, marginTop: 4, fontWeight: '600'}}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <BottomSheet visible={thumbs} onClose={() => setThumbs(false)}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10}}>
          <Text style={{fontSize: 16, fontWeight: '700', color: t.pdf44.text}}>Pages</Text>
          <Pressable onPress={() => { setThumbs(false); go('organize', params); }}>
            <Text style={{fontSize: 13.5, fontWeight: '600', color: t.pdf44.accent}}>Organize</Text>
          </Pressable>
        </View>
        <ScrollView style={{maxHeight: 360}} contentContainerStyle={styles.thumbGrid}>
          {Array.from({length: total}).map((_, i) => (
            <Pressable
              key={i}
              onPress={() => { setThumbs(false); setPage(i + 1); showToast('Jumped to page ' + (i + 1), 'page'); }}
              style={styles.thumbCell}>
              <View style={[styles.miniPage, {borderColor: t.pdf44.border}]}>
                <View style={{height: 5, backgroundColor: accent}} />
              </View>
              <Text style={{fontSize: 11, color: t.pdf44.text3, marginTop: 4}}>{i + 1}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {width: 320, backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 4}},
  pagePill: {position: 'absolute', alignSelf: 'center', bottom: 96, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1},
  actionBar: {position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', height: 72, borderTopWidth: 1, paddingBottom: 8},
  action: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  thumbGrid: {flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 0},
  thumbCell: {width: '33.33%', alignItems: 'center', paddingVertical: 10},
  miniPage: {width: 72, height: 94, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, overflow: 'hidden'},
});
