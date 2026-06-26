import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {GradientBox, toolRamp} from './Gradient';
import Icon from './Icon';

function NewBadge() {
  return (
    <GradientBox colors={['#e5322d', '#ff5a52']} radius={6} style={styles.newBadge}>
      <Text style={styles.newText}>New</Text>
    </GradientBox>
  );
}

export function ToolTile({
  icon,
  color,
  label,
  isNew,
  onPress,
}: {
  icon: string;
  color: string;
  label: string;
  isNew?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: t.pdf44.bgGlass, borderless: false}}
      style={styles.tileWrap}>
      <View>
        <GradientBox colors={toolRamp(color)} radius={18} style={styles.tile}>
          <Icon name={icon} size={27} color="#fff" />
        </GradientBox>
        {isNew && <NewBadge />}
      </View>
      <Text numberOfLines={1} style={[styles.tileLabel, {color: t.pdf44.text2}]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ToolRow({
  icon,
  color,
  title,
  desc,
  isNew,
  onPress,
}: {
  icon: string;
  color: string;
  title: string;
  desc?: string;
  isNew?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: t.pdf44.bgGlass}}
      style={styles.row}>
      <GradientBox colors={toolRamp(color)} radius={13} style={styles.rowTile}>
        <Icon name={icon} size={22} color="#fff" />
      </GradientBox>
      <View style={{flex: 1}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Text style={[styles.rowTitle, {color: t.pdf44.text}]}>{title}</Text>
          {isNew && <NewBadge />}
        </View>
        {!!desc && (
          <Text numberOfLines={1} style={[styles.rowDesc, {color: t.pdf44.text3}]}>
            {desc}
          </Text>
        )}
      </View>
      <Icon name="back" size={18} color={t.pdf44.text3} style={{transform: [{rotate: '180deg'}]}} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tileWrap: {alignItems: 'center', padding: 8, width: '100%'},
  tile: {width: 60, height: 60, alignItems: 'center', justifyContent: 'center'},
  tileLabel: {fontSize: 12, fontWeight: '600', marginTop: 7, textAlign: 'center'},
  newBadge: {position: 'absolute', top: -4, right: -6, paddingHorizontal: 5, paddingVertical: 1},
  newText: {color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4},
  row: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 16},
  rowTile: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  rowTitle: {fontSize: 15.5, fontWeight: '700'},
  rowDesc: {fontSize: 13, marginTop: 2},
});
