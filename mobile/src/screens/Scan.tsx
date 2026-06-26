import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';
import {captureImage, pickImages, writePdf} from '../pdf/operations';
import {imagesToPdf} from '../pdf/engine';
import {FileItem} from '../state/types';

const MODES = ['Document', 'ID Card', 'Book'];

export default function Scan() {
  const t = useTheme() as AppTheme;
  const {back, go, addFile} = useApp();
  const {showToast} = useToast();
  const [mode, setMode] = useState('Document');
  const [shots, setShots] = useState<{bytes: Uint8Array; type: 'jpg' | 'png'}[]>([]);
  const [flash, setFlash] = useState(false);

  const finish = async (imgs: {bytes: Uint8Array; type: 'jpg' | 'png'}[]) => {
    if (!imgs.length) return;
    const bytes = await imagesToPdf(imgs);
    const uri = await writePdf(bytes, 'scan.pdf');
    const file: FileItem = {
      id: 'scan-' + Date.now(),
      name: `Scan ${new Date().toISOString().slice(0, 10)}.pdf`,
      meta: `${imgs.length} page${imgs.length === 1 ? '' : 's'} · just now`,
      accent: '#14b8a6',
      seed: 2,
      starred: false,
      tags: ['Scanned', 'Recent'],
      uri,
      pages: imgs.length,
    };
    addFile(file);
    showToast('Scan saved as PDF', 'scan');
    go('viewer', file);
  };

  const shutter = async () => {
    try {
      const img = await captureImage();
      if (!img) return;
      const next = [...shots, img];
      setShots(next);
      showToast('Captured page ' + next.length, 'scan');
    } catch {
      showToast('Camera unavailable', 'close');
    }
  };

  return (
    <View style={styles.root}>
      {/* top bar */}
      <View style={styles.top}>
        <Pressable onPress={back} hitSlop={10}><Icon name="close" size={26} color="#fff" /></Pressable>
        <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>Scan to PDF</Text>
        <Pressable onPress={() => setFlash(f => !f)} hitSlop={10}><Icon name="flash" size={24} color={flash ? '#ffd166' : '#fff'} /></Pressable>
      </View>

      {/* viewfinder */}
      <View style={styles.viewfinderWrap}>
        <View style={[styles.viewfinder, {borderColor: t.pdf44.accent, shadowColor: t.pdf44.accent}]}>
          {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy], i) => (
            <View key={i} style={[styles.corner, {[cx ? 'right' : 'left']: -2, [cy ? 'bottom' : 'top']: -2, borderTopWidth: cy ? 0 : 3, borderBottomWidth: cy ? 3 : 0, borderLeftWidth: cx ? 0 : 3, borderRightWidth: cx ? 3 : 0, borderColor: t.pdf44.accent}]} />
          ))}
          <Icon name="page" size={48} color="rgba(255,255,255,0.3)" />
        </View>
        <View style={[styles.detected, {backgroundColor: t.pdf44.accent}]}>
          <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff'}} />
          <Text style={{color: '#fff', fontSize: 12.5, fontWeight: '600'}}>Document detected — hold steady</Text>
        </View>
      </View>

      {/* mode selector */}
      <View style={styles.modes}>
        {MODES.map(m => (
          <Pressable key={m} onPress={() => setMode(m)}>
            <Text style={{color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: mode === m ? '700' : '500', fontSize: 13.5}}>{m}</Text>
          </Pressable>
        ))}
      </View>

      {/* bottom controls */}
      <View style={styles.controls}>
        <Pressable onPress={async () => { const imgs = await pickImages(); if (imgs.length) finish(imgs); }} hitSlop={10} style={styles.side}>
          <Icon name="gallery" size={26} color="#fff" />
        </Pressable>
        <Pressable onPress={shutter} style={styles.shutterRing}>
          <View style={styles.shutter} />
        </Pressable>
        <Pressable onPress={() => finish(shots)} hitSlop={10} style={styles.side}>
          {shots.length > 0 ? (
            <View style={[styles.stack, {borderColor: t.pdf44.accent}]}>
              <Icon name="page" size={20} color="#fff" />
              <View style={[styles.count, {backgroundColor: t.pdf44.accent}]}><Text style={{color: '#fff', fontSize: 10, fontWeight: '700'}}>{shots.length}</Text></View>
            </View>
          ) : (
            <View style={{width: 44, height: 44}} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0a0a0f'},
  top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8},
  viewfinderWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18},
  viewfinder: {width: 250, height: 330, borderWidth: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: {width: 0, height: 0}, elevation: 8},
  corner: {position: 'absolute', width: 26, height: 26},
  detected: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999},
  modes: {flexDirection: 'row', justifyContent: 'center', gap: 28, paddingVertical: 18},
  controls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 36, paddingHorizontal: 30},
  side: {width: 52, height: 52, alignItems: 'center', justifyContent: 'center'},
  shutterRing: {width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center'},
  shutter: {width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff'},
  stack: {width: 44, height: 44, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  count: {position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4},
});
