import React from 'react';
import {View} from 'react-native';
import {ToolTile, ToolRow} from '../components/Tool';
import {useApp} from '../state/store';
import {Tool} from '../data/tools';
import {openTool} from './Home';

/** Renders a set of tools as a grid of tiles or a list of rows, per the
 * `toolLayout` preference (live-switchable from Settings). */
export function ToolGroup({items}: {items: Tool[]}) {
  const {state, go} = useApp();
  if (state.toolLayout === 'list') {
    return (
      <View style={{paddingHorizontal: 12}}>
        {items.map(t => (
          <ToolRow
            key={t.id}
            icon={t.icon}
            color={t.color}
            title={t.title || t.label || ''}
            desc={t.desc || 'Runs on your device'}
            isNew={t.isNew}
            onPress={() => openTool(go, t)}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14}}>
      {items.map(t => (
        <View key={t.id} style={{width: '25%'}}>
          <ToolTile
            icon={t.icon}
            color={t.color}
            label={(t.title || t.label || '').replace(/ PDF$/, '')}
            isNew={t.isNew}
            onPress={() => openTool(go, t)}
          />
        </View>
      ))}
    </View>
  );
}
