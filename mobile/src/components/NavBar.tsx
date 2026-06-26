import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {GradientBox, BRAND} from './Gradient';
import Icon from './Icon';
import {TabName} from '../state/types';

interface Dest {
  key: TabName | 'scan';
  icon: string;
  label: string;
}

const BASE: Dest[] = [
  {key: 'home', icon: 'home', label: 'Home'},
  {key: 'tools', icon: 'tools', label: 'Tools'},
  {key: 'files', icon: 'files', label: 'Files'},
  {key: 'settings', icon: 'settings', label: 'Settings'},
];

/** M3 bottom navigation bar with the active-indicator pill. */
export function NavBar({
  tab,
  navStyle,
  onTab,
  onScan,
}: {
  tab: TabName;
  navStyle: 'fab' | 'bar';
  onTab: (t: TabName) => void;
  onScan: () => void;
}) {
  const t = useTheme() as AppTheme;
  // When nav style = "bar", Scan becomes a 5th destination.
  const dests: Dest[] =
    navStyle === 'bar'
      ? [BASE[0], BASE[1], {key: 'scan', icon: 'scan', label: 'Scan'}, BASE[2], BASE[3]]
      : BASE;

  return (
    <View style={[styles.bar, {backgroundColor: t.pdf44.bg2, borderTopColor: t.pdf44.border}]}>
      {dests.map(d => {
        const active = d.key === tab;
        return (
          <Pressable
            key={d.key}
            onPress={() => (d.key === 'scan' ? onScan() : onTab(d.key as TabName))}
            android_ripple={{color: t.pdf44.bgGlass, borderless: true, radius: 40}}
            style={styles.dest}>
            <View style={[styles.pill, active && {backgroundColor: t.pdf44.accentGlow}]}>
              <Icon name={d.icon} size={24} color={active ? t.pdf44.accent : t.pdf44.text3} />
            </View>
            <Text style={{fontSize: 11, fontWeight: active ? '700' : '500', color: active ? t.pdf44.text : t.pdf44.text3, marginTop: 3}}>
              {d.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Brand-gradient Scan FAB (extended on the Files tab). */
export function ScanFab({extended, onPress}: {extended?: boolean; onPress?: () => void}) {
  return (
    <Pressable onPress={onPress} style={styles.fabWrap} android_ripple={{color: 'rgba(255,255,255,0.25)', borderless: true, radius: 40}}>
      <GradientBox colors={BRAND} radius={20} style={[styles.fab, extended ? styles.fabExtended : null]}>
        <Icon name="scan" size={26} color="#fff" />
        {extended && <Text style={styles.fabLabel}>Scan</Text>}
      </GradientBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {flexDirection: 'row', height: 74, borderTopWidth: 1, paddingBottom: 8, paddingTop: 8},
  dest: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  pill: {width: 60, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  fabWrap: {position: 'absolute', right: 18, bottom: 88},
  fab: {minWidth: 60, height: 60, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, shadowColor: '#e5322d', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 8},
  fabExtended: {paddingHorizontal: 22},
  fabLabel: {color: '#fff', fontWeight: '700', fontSize: 15},
});
