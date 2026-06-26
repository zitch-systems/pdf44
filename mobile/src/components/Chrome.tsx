import React from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Icon from './Icon';

export interface BarAction {
  icon: string;
  label: string;
  primary?: boolean;
  onPress?: () => void;
}

/** Material 3 top app bar. `large` renders the headline below the row. */
export function TopAppBar({
  title,
  subtitle,
  large,
  onBack,
  actions = [],
}: {
  title: string;
  subtitle?: string;
  large?: boolean;
  onBack?: () => void;
  actions?: BarAction[];
}) {
  const t = useTheme() as AppTheme;
  return (
    <View style={{paddingTop: 6, paddingBottom: large ? 4 : 8, backgroundColor: t.pdf44.bg}}>
      <View style={styles.barRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} android_ripple={{color: t.pdf44.bgGlass, borderless: true}} style={styles.iconBtn}>
            <Icon name="back" size={24} color={t.pdf44.text} />
          </Pressable>
        ) : (
          <View style={{width: 8}} />
        )}
        {!large && (
          <View style={{flex: 1}}>
            <Text numberOfLines={1} style={{fontSize: 19, fontWeight: '700', color: t.pdf44.text, letterSpacing: -0.3}}>
              {title}
            </Text>
            {!!subtitle && <Text numberOfLines={1} style={{fontSize: 12, color: t.pdf44.text3}}>{subtitle}</Text>}
          </View>
        )}
        {large && <View style={{flex: 1}} />}
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          {actions.map(a =>
            a.primary ? (
              <Pressable key={a.label} onPress={a.onPress} android_ripple={{color: 'rgba(255,255,255,0.2)', borderless: true}} style={[styles.primaryAction, {backgroundColor: t.pdf44.accent}]}>
                <Icon name={a.icon} size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable key={a.label} onPress={a.onPress} hitSlop={8} android_ripple={{color: t.pdf44.bgGlass, borderless: true}} style={styles.iconBtn}>
                <Icon name={a.icon} size={22} color={t.pdf44.text2} />
              </Pressable>
            ),
          )}
        </View>
      </View>
      {large && (
        <View style={{paddingHorizontal: 22, paddingTop: 4}}>
          <Text style={{fontSize: 33, fontWeight: '800', color: t.pdf44.text, letterSpacing: -0.6}}>{title}</Text>
          {!!subtitle && <Text style={{fontSize: 13.5, color: t.pdf44.text3, marginTop: 2}}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

export function SearchBar({placeholder = 'Search tools & files', onPress, avatar = 'AC'}: {placeholder?: string; onPress?: () => void; avatar?: string}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable onPress={onPress} style={[styles.search, {backgroundColor: t.pdf44.bg3}]}>
      <Icon name="search" size={22} color={t.pdf44.text3} />
      <Text style={{flex: 1, fontSize: 15.5, color: t.pdf44.text3, marginLeft: 10}}>{placeholder}</Text>
      <View style={[styles.avatar, {backgroundColor: t.pdf44.accent}]}>
        <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>{avatar}</Text>
      </View>
    </Pressable>
  );
}

export function Chip({label, selected, icon, onPress}: {label: string; selected?: boolean; icon?: string; onPress?: () => void}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: t.pdf44.bgGlass}}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? t.pdf44.accent : t.pdf44.bg3,
          borderColor: selected ? t.pdf44.accent : t.pdf44.borderStrong,
        },
      ]}>
      {!!icon && <Icon name={icon} size={15} color={selected ? '#fff' : t.pdf44.text3} style={{marginRight: 5}} />}
      <Text style={{fontSize: 13.5, fontWeight: '600', color: selected ? '#fff' : t.pdf44.text2}}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeader({title, actionLabel, onAction}: {title: string; actionLabel?: string; onAction?: () => void}) {
  const t = useTheme() as AppTheme;
  return (
    <View style={styles.sectionHeader}>
      <Text style={{fontSize: 16.5, fontWeight: '700', color: t.pdf44.text}}>{title}</Text>
      {!!actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{fontSize: 13.5, fontWeight: '600', color: t.pdf44.accent}}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Scrollable body region. */
export function Body({children, style, contentStyle}: {children: React.ReactNode; style?: ViewStyle; contentStyle?: ViewStyle}) {
  return (
    <ScrollView style={[{flex: 1}, style]} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function ChipRow({children}: {children: React.ReactNode}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingHorizontal: 22, paddingVertical: 8}}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  barRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 52, gap: 6},
  iconBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  primaryAction: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
  search: {flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 28, paddingHorizontal: 16, marginHorizontal: 22, marginTop: 8, marginBottom: 4},
  avatar: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  chip: {flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8},
});
