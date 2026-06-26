import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme, Button} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {BrandMark, GradientBox, toolRamp} from '../components/Gradient';
import Icon from '../components/Icon';
import {useApp} from '../state/store';

const FEATURES = [
  {icon: 'shield_check', color: 'green', title: 'No file ever leaves your device', desc: 'Every operation runs fully on-device.'},
  {icon: 'tools', color: 'blue', title: '41+ tools, one app', desc: 'Convert, edit, sign, organize and secure.'},
  {icon: 'unlock', color: 'orange', title: 'No registration, no watermarks', desc: 'Free and private by design.'},
];

export default function Onboarding() {
  const t = useTheme() as AppTheme;
  const {dispatch, navTab} = useApp();
  const finish = () => {
    dispatch({type: 'setPref', key: 'onboarded', value: true});
    navTab('home');
  };
  return (
    <View style={[styles.root, {backgroundColor: t.pdf44.bg}]}>
      <View style={[styles.glow, {backgroundColor: t.pdf44.accentGlow}]} />
      <View style={{alignItems: 'center', marginTop: 20}}>
        <BrandMark size={64} radius={20} />
      </View>
      <Text style={[styles.h1, {color: t.pdf44.text}]}>
        PDF tools that stay{'\n'}
        <Text style={{color: t.pdf44.accent}}>private &amp; on-device</Text>
      </Text>
      <Text style={[styles.lead, {color: t.pdf44.text2}]}>
        Merge, edit, sign and convert PDFs — without uploading a single file.
      </Text>
      <View style={{marginTop: 28, gap: 18}}>
        {FEATURES.map(f => (
          <View key={f.title} style={styles.feature}>
            <GradientBox colors={toolRamp(f.color)} radius={13} style={styles.featIcon}>
              <Icon name={f.icon} size={22} color="#fff" />
            </GradientBox>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 15.5, fontWeight: '700', color: t.pdf44.text}}>{f.title}</Text>
              <Text style={{fontSize: 13.5, color: t.pdf44.text3, marginTop: 2}}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{flex: 1}} />
      <Button mode="contained" onPress={finish} contentStyle={{height: 52}} style={{borderRadius: 14}} labelStyle={{fontSize: 16, fontWeight: '700'}}>
        Get started
      </Button>
      <Text onPress={finish} style={[styles.skip, {color: t.pdf44.text3}]}>
        Skip
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 28},
  glow: {position: 'absolute', top: -120, alignSelf: 'center', width: 320, height: 320, borderRadius: 160, opacity: 0.6},
  h1: {fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 40, marginTop: 28},
  lead: {fontSize: 16.5, lineHeight: 24, marginTop: 14},
  feature: {flexDirection: 'row', alignItems: 'center', gap: 14},
  featIcon: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  skip: {textAlign: 'center', fontSize: 14.5, fontWeight: '600', paddingVertical: 16},
});
