import React, {useState} from 'react';
import {View} from 'react-native';
import {TopAppBar, SearchBar, Chip, SectionHeader, Body, ChipRow} from '../components/Chrome';
import {ToolGroup} from './ToolGroup';
import {useApp} from '../state/store';
import {ALL, TOOL_CATEGORIES} from '../data/tools';

export default function AllTools() {
  const {go} = useApp();
  const [cat, setCat] = useState('All');
  const groups = cat === 'All' ? ALL : ALL.filter(g => g.cat === cat);
  return (
    <View style={{flex: 1}}>
      <TopAppBar title="All tools" subtitle="41+ tools · everything runs on-device" large />
      <Body contentStyle={{paddingBottom: 120}}>
        <SearchBar placeholder="Search 41+ tools" onPress={() => go('search')} />
        <ChipRow>
          {TOOL_CATEGORIES.map(c => (
            <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </ChipRow>
        {groups.map(g => (
          <View key={g.cat}>
            <SectionHeader title={g.cat} />
            <ToolGroup items={g.items} />
          </View>
        ))}
      </Body>
    </View>
  );
}
