import React, {useRef, useState} from 'react';
import {View, Text, Pressable, PanResponder, StyleSheet, TextInput} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import Svg, {Path} from 'react-native-svg';
import {TopAppBar, Body} from '../components/Chrome';
import {BottomSheet} from '../components/Sheet';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';

const INK = ['#0f1729', '#1d4ed8', '#e5322d'];

function SignaturePad({color, onPath}: {color: string; onPath: (d: string) => void}) {
  const t = useTheme() as AppTheme;
  const [d, setD] = useState('');
  const path = useRef('');
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        path.current = `M${e.nativeEvent.locationX.toFixed(1)},${e.nativeEvent.locationY.toFixed(1)}`;
        setD(path.current);
      },
      onPanResponderMove: e => {
        path.current += ` L${e.nativeEvent.locationX.toFixed(1)},${e.nativeEvent.locationY.toFixed(1)}`;
        setD(path.current);
      },
      onPanResponderRelease: () => onPath(path.current),
    }),
  ).current;
  return (
    <View style={[styles.pad, {borderColor: t.pdf44.border}]} {...responder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        <Path d={d} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {!d && <Text style={{color: '#9aa3b2', fontSize: 14}}>Draw your signature here</Text>}
    </View>
  );
}

export default function FillSign() {
  const t = useTheme() as AppTheme;
  const {params, back} = useApp();
  const {showToast} = useToast();
  const mode = params?.mode || 'both';
  const [sheet, setSheet] = useState(mode === 'sign');
  const [seg, setSeg] = useState<'Draw' | 'Type' | 'Image'>('Draw');
  const [ink, setInk] = useState(INK[0]);
  const [typed, setTyped] = useState('Alex Cole');
  const [drawn, setDrawn] = useState('');
  const [signed, setSigned] = useState(false);
  const [checked, setChecked] = useState(false);

  const tools = mode === 'fill' ? ['Text', 'Check', 'Date'] : mode === 'sign' ? ['Sign'] : ['Text', 'Check', 'Date', 'Sign'];

  const useSignature = () => {
    setSigned(true);
    setSheet(false);
    showToast('Signature added', 'sign');
  };

  return (
    <View style={{flex: 1}}>
      <TopAppBar
        title={mode === 'fill' ? 'Fill PDF' : mode === 'sign' ? 'Sign PDF' : 'Fill & Sign'}
        onBack={back}
        actions={[
          signed
            ? {icon: 'install', label: 'Export', primary: true, onPress: () => { showToast('Exported signed PDF', 'install'); back(); }}
            : {icon: 'share', label: 'Share', onPress: () => showToast('Sharing', 'share')},
        ]}
      />
      {/* form tools */}
      <View style={styles.toolRow}>
        {tools.map(tool => {
          const disabled = tool === 'Sign' && mode === 'fill';
          return (
            <Pressable
              key={tool}
              disabled={disabled}
              onPress={() => (tool === 'Sign' ? setSheet(true) : showToast('Tap the form to add ' + tool, 'text'))}
              style={[styles.formTool, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border, opacity: disabled ? 0.4 : 1}]}>
              <Icon name={tool === 'Sign' ? 'sign' : tool === 'Check' ? 'check' : tool === 'Date' ? 'history' : 'text'} size={18} color={t.pdf44.text2} />
              <Text style={{fontSize: 13, color: t.pdf44.text2, fontWeight: '600'}}>{tool}</Text>
            </Pressable>
          );
        })}
      </View>

      <Body contentStyle={{padding: 20, alignItems: 'center'}}>
        <View style={styles.formPage}>
          <Text style={{fontSize: 13, color: '#475569', marginBottom: 6}}>Full name</Text>
          <View style={{borderBottomWidth: 1.5, borderColor: '#cbd5e1', paddingBottom: 6, marginBottom: 24}}>
            <Text style={{fontSize: 16, color: '#0f1729'}}>Alex Cole</Text>
          </View>
          <Pressable onPress={() => setChecked(c => !c)} style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28}}>
            <View style={{width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: checked ? t.pdf44.accent : '#94a3b8', backgroundColor: checked ? t.pdf44.accent : 'transparent', alignItems: 'center', justifyContent: 'center'}}>
              {checked && <Icon name="check" size={12} color="#fff" />}
            </View>
            <Text style={{fontSize: 13.5, color: '#475569'}}>I agree to the terms above</Text>
          </Pressable>
          <Text style={{fontSize: 13, color: '#475569', marginBottom: 8}}>Signature</Text>
          <Pressable onPress={() => setSheet(true)} style={[styles.signTarget, {borderColor: signed ? t.pdf44.accent : '#cbd5e1'}]}>
            {signed ? (
              seg === 'Type' || drawn === '' ? (
                <Text style={{fontSize: 26, color: ink, fontStyle: 'italic', fontFamily: 'serif'}}>{typed}</Text>
              ) : (
                <Svg width={180} height={56}><Path d={drawn} stroke={ink} strokeWidth={3} fill="none" /></Svg>
              )
            ) : (
              <Text style={{color: '#94a3b8', fontSize: 14}}>Tap to sign</Text>
            )}
          </Pressable>
        </View>
      </Body>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <Text style={{fontSize: 16, fontWeight: '700', color: t.pdf44.text, paddingHorizontal: 16, paddingBottom: 12}}>Add signature</Text>
        <View style={{flexDirection: 'row', marginHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: t.pdf44.borderStrong, overflow: 'hidden', marginBottom: 14}}>
          {(['Draw', 'Type', 'Image'] as const).map(s => (
            <Pressable key={s} onPress={() => setSeg(s)} style={{flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: seg === s ? t.pdf44.accentGlow : 'transparent'}}>
              <Text style={{fontWeight: '600', color: seg === s ? t.pdf44.accent : t.pdf44.text3}}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{paddingHorizontal: 16}}>
          {seg === 'Draw' && <SignaturePad color={ink} onPath={setDrawn} />}
          {seg === 'Type' && (
            <View style={[styles.pad, {borderColor: t.pdf44.border}]}>
              <TextInput value={typed} onChangeText={setTyped} style={{fontSize: 30, fontStyle: 'italic', color: ink, fontFamily: 'serif', textAlign: 'center', width: '100%'}} />
            </View>
          )}
          {seg === 'Image' && (
            <Pressable onPress={() => showToast('Pick a signature photo', 'image')} style={[styles.pad, {borderColor: t.pdf44.border}]}>
              <Icon name="image" size={30} color={t.pdf44.text3} />
              <Text style={{color: t.pdf44.text3, marginTop: 8}}>Upload a photo of your signature</Text>
            </Pressable>
          )}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14}}>
          <View style={{flexDirection: 'row', gap: 12}}>
            {INK.map(c => (
              <Pressable key={c} onPress={() => setInk(c)} style={{width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: 2, borderColor: ink === c ? t.pdf44.text : 'transparent'}} />
            ))}
          </View>
          <View style={{flexDirection: 'row', gap: 8}}>
            <Pressable onPress={() => { setDrawn(''); }} style={[styles.btnGhost, {borderColor: t.pdf44.borderStrong}]}>
              <Text style={{color: t.pdf44.text2, fontWeight: '600'}}>Clear</Text>
            </Pressable>
            <Pressable onPress={useSignature} style={[styles.btnPrimary, {backgroundColor: t.pdf44.accent}]}>
              <Text style={{color: '#fff', fontWeight: '700'}}>Use signature</Text>
            </Pressable>
          </View>
        </View>
        <View style={{height: 16}} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  toolRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8},
  formTool: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1},
  formPage: {width: 330, backgroundColor: '#fff', borderRadius: 8, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 4}},
  signTarget: {height: 72, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  pad: {height: 150, borderWidth: 1, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  btnGhost: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1},
  btnPrimary: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10},
});
