import React, {useState} from 'react';
import {View, StyleSheet, Text, ViewStyle, StyleProp} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';
import {toolGradients} from '../theme/tokens';

let _gid = 0;

/** A rounded rectangle filled with a 135° linear gradient, content layered on top. */
export function GradientBox({
  colors,
  radius = 16,
  style,
  children,
}: {
  colors: [string, string];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const [id] = useState(() => 'grad' + _gid++);
  const [size, setSize] = useState({w: 0, h: 0});
  return (
    <View
      style={[{borderRadius: radius, overflow: 'hidden'}, style]}
      onLayout={e => setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}>
      {size.w > 0 && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} rx={radius} ry={radius} fill={`url(#${id})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}

export function toolRamp(color: string): [string, string] {
  return toolGradients[color] || toolGradients.slate;
}

export const BRAND: [string, string] = ['#e5322d', '#ff5a52'];

/** The "P" brand mark — gradient rounded square. */
export function BrandMark({size = 34, radius = 11}: {size?: number; radius?: number}) {
  return (
    <GradientBox
      colors={BRAND}
      radius={radius}
      style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{color: '#fff', fontWeight: '800', fontSize: size * 0.47}}>P</Text>
    </GradientBox>
  );
}
