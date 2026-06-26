import React, {useEffect, useRef} from 'react';
import {Animated, View, Text, Pressable, StyleSheet, Modal, Easing} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Icon from './Icon';

/** M3 bottom sheet: scrim + drag handle, rises from the bottom, dismiss on scrim. */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTheme() as AppTheme;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Animated.View style={{opacity: slide, ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)'}} />
      </Pressable>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: t.pdf44.bgElev,
            transform: [{translateY: slide.interpolate({inputRange: [0, 1], outputRange: [600, 0]})}],
          },
        ]}>
        <View style={[styles.handle, {backgroundColor: t.pdf44.borderStrong}]} />
        {children}
      </Animated.View>
    </Modal>
  );
}

export interface SheetItem {
  icon: string;
  label: string;
  danger?: boolean;
  onPress?: () => void;
}

/** Action sheet with an optional header and a list of tappable rows. */
export function ActionSheet({
  visible,
  onClose,
  header,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  items: SheetItem[];
}) {
  const t = useTheme() as AppTheme;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {header && <View style={[styles.header, {borderBottomColor: t.pdf44.border}]}>{header}</View>}
      <View style={{paddingVertical: 6, paddingBottom: 28}}>
        {items.map(it => (
          <Pressable
            key={it.label}
            onPress={() => {
              onClose();
              it.onPress?.();
            }}
            android_ripple={{color: t.pdf44.bgGlass}}
            style={styles.item}>
            <Icon name={it.icon} size={22} color={it.danger ? t.pdf44.error : t.pdf44.text2} />
            <Text style={{fontSize: 15.5, fontWeight: '600', color: it.danger ? t.pdf44.error : t.pdf44.text}}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrim: {...StyleSheet.absoluteFillObject},
  sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 8},
  handle: {alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 8},
  header: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1},
  item: {flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14},
});
