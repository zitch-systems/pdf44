import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {BrandMark} from '../components/Gradient';
import {SearchBar, SectionHeader, Body} from '../components/Chrome';
import {ToolGroup} from './ToolGroup';
import {ToolRow} from '../components/Tool';
import {FileCard} from '../components/Files';
import {useApp} from '../state/store';
import {QUICK, POPULAR, routeFor, Tool} from '../data/tools';

export function openTool(go: (s: string, p?: any) => void, t: Tool) {
  go(routeFor(t.id), {label: t.title || t.label, icon: t.icon, color: t.color, mode: t.mode, toolId: t.id});
}

function GreetingHeader() {
  const t = useTheme() as AppTheme;
  return (
    <View style={styles.greet}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 11}}>
        <BrandMark size={34} />
        <Text style={{fontSize: 20, fontWeight: '800', color: t.pdf44.text, letterSpacing: -0.4}}>
          PDF<Text style={{color: t.pdf44.accent}}>44</Text>
        </Text>
      </View>
      <View style={[styles.statusChip, {backgroundColor: t.pdf44.bg3}]}>
        <View style={[styles.dot, {backgroundColor: t.pdf44.success}]} />
        <Text style={{fontSize: 11.5, fontWeight: '700', color: t.pdf44.success}}>On-device</Text>
      </View>
    </View>
  );
}

export default function Home() {
  const t = useTheme() as AppTheme;
  const {go, navTab} = useApp();
  return (
    <View style={{flex: 1}}>
      <View style={{paddingTop: 6}}>
        <GreetingHeader />
      </View>
      <Body contentStyle={{paddingBottom: 120}}>
        <View style={{paddingHorizontal: 26, paddingTop: 10}}>
          <Text style={{fontSize: 13.5, color: t.pdf44.text3, fontWeight: '500'}}>Good morning, Alex</Text>
        </View>
        <SearchBar onPress={() => go('search')} />
        <SectionHeader title="Quick actions" />
        <ToolGroup items={QUICK} />
        <SectionHeader title="Recent" actionLabel="All files" onAction={() => navTab('files')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 14, paddingHorizontal: 22, paddingBottom: 6}}>
          {RECENTS.map((f, i) => (
            <FileCard key={i} {...f} onPress={() => go('viewer', f)} />
          ))}
        </ScrollView>
        <SectionHeader title="Popular tools" actionLabel="See all" onAction={() => navTab('tools')} />
        <View style={{paddingHorizontal: 12}}>
          {POPULAR.map(tool => (
            <ToolRow key={tool.id} icon={tool.icon} color={tool.color} title={tool.title} desc={tool.desc} isNew={tool.isNew} onPress={() => openTool(go, tool)} />
          ))}
        </View>
      </Body>
    </View>
  );
}

export const RECENTS = [
  {name: 'Lease Agreement.pdf', meta: '12 pages · 2h ago', accent: '#e5322d', seed: 0},
  {name: 'Invoice 0481.pdf', meta: '2 pages · Yesterday', accent: '#3b82f6', seed: 1},
  {name: 'Resume — A. Cole.pdf', meta: '1 page · Mon', accent: '#22c55e', seed: 2},
  {name: 'Q2 Report.pdf', meta: '34 pages · Apr 28', accent: '#f97316', seed: 0},
];

const styles = StyleSheet.create({
  greet: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 4},
  statusChip: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999},
  dot: {width: 7, height: 7, borderRadius: 4},
});
