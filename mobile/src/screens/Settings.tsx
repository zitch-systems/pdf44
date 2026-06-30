import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTheme, Switch} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar, Body, SectionHeader} from '../components/Chrome';
import {GradientBox, BRAND} from '../components/Gradient';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';
import {accentList} from '../theme/theme';
import {AccentKey} from '../theme/tokens';
import {SEED_FILES} from '../state/reducer';

function Row({icon, label, value, onPress, right}: {icon: string; label: string; value?: string; onPress?: () => void; right?: React.ReactNode}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable onPress={onPress} android_ripple={{color: t.pdf44.bgGlass}} style={styles.row}>
      <Icon name={icon} size={22} color={t.pdf44.text2} />
      <View style={{flex: 1}}>
        <Text style={{fontSize: 15.5, fontWeight: '500', color: t.pdf44.text}}>{label}</Text>
        {!!value && <Text style={{fontSize: 12.5, color: t.pdf44.text3, marginTop: 1}}>{value}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

function Card({children}: {children: React.ReactNode}) {
  const t = useTheme() as AppTheme;
  return <View style={[styles.card, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border}]}>{children}</View>;
}

export default function Settings() {
  const t = useTheme() as AppTheme;
  const {state, dispatch} = useApp();
  const {showToast} = useToast();
  const setPref = (key: any, value: any) => dispatch({type: 'setPref', key, value});

  return (
    <View style={{flex: 1}}>
      <TopAppBar title="Settings" large />
      <Body contentStyle={{paddingBottom: 120, paddingHorizontal: 18}}>
        {/* Account */}
        <Card>
          <View style={styles.account}>
            <GradientBox colors={BRAND} radius={16} style={styles.avatar}>
              <Text style={{color: '#fff', fontWeight: '800', fontSize: 20}}>AC</Text>
            </GradientBox>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 17, fontWeight: '700', color: t.pdf44.text}}>Alex Cole</Text>
              <Text style={{fontSize: 13, color: t.pdf44.text3, marginTop: 2}}>Subscription · Active</Text>
            </View>
            <GradientBox colors={BRAND} radius={8} style={styles.pro}>
              <Text style={{color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5}}>PRO</Text>
            </GradientBox>
          </View>
        </Card>

        <SectionHeader title="Subscription" />
        <Card>
          <Row icon="shield_check" label="PDF44 PRO" value="$3.99 / mo · renews Jul 26, 2026" />
          <Divider />
          <Row icon="history" label="Manage subscription" onPress={() => showToast('Opening subscription', 'history')} />
          <Divider />
          <Row icon="install" label="Restore purchases" onPress={() => showToast('Restoring purchases…', 'install')} />
        </Card>

        <SectionHeader title="Appearance" />
        <Card>
          <Row icon="settings" label="Dark theme" right={<Switch value={state.dark} onValueChange={v => setPref('dark', v)} />} />
          <Divider />
          <Row
            icon="tools"
            label="Tool layout"
            value={state.toolLayout === 'grid' ? 'Grid of tiles' : 'List rows'}
            onPress={() => setPref('toolLayout', state.toolLayout === 'grid' ? 'list' : 'grid')}
          />
          <Divider />
          <Row
            icon="organize"
            label="Navigation style"
            value={state.navStyle === 'fab' ? 'Scan FAB' : 'Scan tab'}
            onPress={() => setPref('navStyle', state.navStyle === 'fab' ? 'bar' : 'fab')}
          />
          <Divider />
          <View style={styles.accentRow}>
            <Text style={{fontSize: 15.5, color: t.pdf44.text, fontWeight: '500'}}>Accent</Text>
            <View style={{flexDirection: 'row', gap: 12}}>
              {accentList.map(a => (
                <Pressable key={a.key} onPress={() => setPref('accent', a.key as AccentKey)}>
                  <View style={[styles.swatch, {backgroundColor: a.color, borderColor: state.accent === a.key ? t.pdf44.text : 'transparent'}]} />
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <SectionHeader title="Privacy" />
        <Card>
          <Row icon="shield_check" label="On-device processing" value="Always on — files never leave the device" right={<Switch value disabled />} />
          <Divider />
          <Row icon="eye" label="Privacy policy" onPress={() => showToast('Opening privacy policy', 'eye')} />
        </Card>

        <SectionHeader title="App" />
        <Card>
          <Row
            icon="trash"
            label="Clear recent files"
            onPress={() => {
              dispatch({type: 'setFiles', files: SEED_FILES});
              showToast('Recent files reset', 'trash');
            }}
          />
          <Divider />
          <Row icon="history" label="About PDF44" value="v1.0.0 · replay intro" onPress={() => setPref('onboarded', false)} />
        </Card>

        <Text style={{textAlign: 'center', fontSize: 12, color: t.pdf44.text3, marginTop: 24}}>No uploads · no registration · no watermarks</Text>
      </Body>
    </View>
  );
}

function Divider() {
  const t = useTheme() as AppTheme;
  return <View style={{height: 1, backgroundColor: t.pdf44.border, marginLeft: 52}} />;
}

const styles = StyleSheet.create({
  card: {borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginTop: 4},
  account: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16},
  avatar: {width: 56, height: 56, alignItems: 'center', justifyContent: 'center'},
  pro: {paddingHorizontal: 10, paddingVertical: 5},
  row: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 16},
  accentRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16},
  swatch: {width: 26, height: 26, borderRadius: 13, borderWidth: 2},
});
