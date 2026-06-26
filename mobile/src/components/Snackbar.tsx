import React, {useEffect, useRef} from 'react';
import {Animated, Text, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Icon from './Icon';
import {useToast} from '../state/store';

/** M3 snackbar anchored above the nav bar, with a leading accent icon. */
export function SnackbarHost({bottomOffset = 84}: {bottomOffset?: number}) {
  const t = useTheme() as AppTheme;
  const {toast} = useToast();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: toast ? 1 : 0,
      useNativeDriver: true,
      bounciness: toast ? 8 : 0,
      speed: 14,
    }).start();
  }, [toast, anim]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.snack,
        {
          bottom: bottomOffset,
          backgroundColor: t.pdf44.bgElev,
          borderColor: t.pdf44.border,
          opacity: anim,
          transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})}],
        },
      ]}>
      <Icon name={toast.icon || 'check'} size={20} color={t.pdf44.accent} />
      <Text numberOfLines={2} style={{color: t.pdf44.text, fontSize: 14, fontWeight: '500', flex: 1}}>
        {toast.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snack: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
  },
});
