import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Icon from './Icon';

/** Generated "paper" thumbnail: white card, accent top band, skeleton lines. */
export function DocThumb({w = 42, accent = '#e5322d', seed = 0}: {w?: number; accent?: string; seed?: number}) {
  const h = w * 1.3;
  const lines = [0.8, 0.62, 0.7, 0.45][seed % 4];
  const rows = [4, 3, 5, 3][seed % 4];
  return (
    <View style={[styles.thumb, {width: w, height: h}]}>
      <View style={{height: h * 0.12, backgroundColor: accent}} />
      <View style={{padding: w * 0.12, gap: h * 0.06}}>
        {Array.from({length: rows}).map((_, i) => (
          <View
            key={i}
            style={{
              height: 2.5,
              borderRadius: 2,
              backgroundColor: '#d6dae3',
              width: `${Math.round((i === 0 ? lines : 0.55 + ((i * 7) % 4) * 0.1) * 100)}%`,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function FileCard({
  name,
  meta,
  accent,
  seed,
  onPress,
}: {
  name: string;
  meta: string;
  accent: string;
  seed: number;
  onPress?: () => void;
}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable onPress={onPress} android_ripple={{color: t.pdf44.bgGlass}} style={[styles.card, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border}]}>
      <View style={{alignItems: 'center', paddingVertical: 14, backgroundColor: t.pdf44.bg3}}>
        <DocThumb w={54} accent={accent} seed={seed} />
      </View>
      <View style={{padding: 12}}>
        <Text numberOfLines={1} style={{fontSize: 13.5, fontWeight: '700', color: t.pdf44.text}}>
          {name}
        </Text>
        <Text numberOfLines={1} style={{fontSize: 11.5, color: t.pdf44.text3, marginTop: 3}}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

export function FileRow({
  name,
  meta,
  accent,
  seed,
  starred,
  onPress,
  onMore,
}: {
  name: string;
  meta: string;
  accent: string;
  seed: number;
  starred?: boolean;
  onPress?: () => void;
  onMore?: () => void;
}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable onPress={onPress} android_ripple={{color: t.pdf44.bgGlass}} style={styles.fileRow}>
      <DocThumb w={42} accent={accent} seed={seed} />
      <View style={{flex: 1}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Text numberOfLines={1} style={{fontSize: 15, fontWeight: '600', color: t.pdf44.text, flexShrink: 1}}>
            {name}
          </Text>
          {starred && <Icon name="star-filled" size={14} color={t.pdf44.warning} />}
        </View>
        <Text numberOfLines={1} style={{fontSize: 12.5, color: t.pdf44.text3, marginTop: 2}}>
          {meta}
        </Text>
      </View>
      {onMore && (
        <Pressable onPress={onMore} hitSlop={10} android_ripple={{color: t.pdf44.bgGlass, borderless: true}} style={styles.more}>
          <Text style={{color: t.pdf44.text3, fontSize: 22, marginTop: -6}}>⋮</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: {borderRadius: 6, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)'},
  card: {width: 152, borderRadius: 16, overflow: 'hidden', borderWidth: 1},
  fileRow: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 22},
  more: {width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17},
});
