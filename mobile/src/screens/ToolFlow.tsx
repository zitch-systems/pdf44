import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet, ActivityIndicator} from 'react-native';
import {useTheme, Button} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar, Body} from '../components/Chrome';
import {GradientBox, toolRamp} from '../components/Gradient';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';
import {FileItem} from '../state/types';
import {runTool, isReal} from '../pdf/operations';

function Checkbox({checked, label, onToggle}: {checked: boolean; label: string; onToggle: () => void}) {
  const t = useTheme() as AppTheme;
  return (
    <Pressable onPress={onToggle} style={styles.check}>
      <View style={[styles.box, {borderColor: checked ? t.pdf44.accent : t.pdf44.borderStrong, backgroundColor: checked ? t.pdf44.accent : 'transparent'}]}>
        {checked && <Icon name="check" size={14} color="#fff" />}
      </View>
      <Text style={{fontSize: 14.5, color: t.pdf44.text}}>{label}</Text>
    </Pressable>
  );
}

export default function ToolFlow() {
  const t = useTheme() as AppTheme;
  const {params, back, go, addFile} = useApp();
  const {showToast} = useToast();
  const toolId: string = params?.toolId || 'merge';
  const label: string = params?.label || 'Tool';
  const real = isReal(toolId);

  const [removeMeta, setRemoveMeta] = useState(true);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [busy, setBusy] = useState(false);

  const process = async () => {
    setBusy(true);
    try {
      const res = await runTool(toolId, label);
      if (res.real && res.uri) {
        const file: FileItem = {
          id: 'out-' + Date.now(),
          name: res.name,
          meta: `${res.pages} page${res.pages === 1 ? '' : 's'} · just now`,
          accent: t.pdf44.accent,
          seed: 0,
          starred: false,
          tags: ['Recent'],
          uri: res.uri,
          pages: res.pages,
        };
        addFile(file);
        showToast(res.message, 'check');
        go('viewer', file);
      } else {
        showToast(res.message, 'shield_check');
      }
    } catch (err: any) {
      if (err?.message !== 'cancelled') showToast(err?.message || 'Could not complete', 'close');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{flex: 1}}>
      <TopAppBar title={label} onBack={back} />
      <Body contentStyle={{padding: 18, paddingBottom: 40}}>
        {/* Tool identity */}
        <View style={styles.identity}>
          <GradientBox colors={toolRamp(params?.color || 'red')} radius={16} style={styles.idIcon}>
            <Icon name={params?.icon || 'merge'} size={28} color="#fff" />
          </GradientBox>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 18, fontWeight: '700', color: t.pdf44.text}}>{label}</Text>
            <Text style={{fontSize: 13, color: t.pdf44.text3, marginTop: 2}}>Runs entirely on your device</Text>
          </View>
        </View>

        {/* Upload zone */}
        <Pressable onPress={process} style={[styles.upload, {borderColor: t.pdf44.borderStrong, backgroundColor: t.pdf44.bg2}]}>
          <Icon name="jpg2pdf" size={34} color={t.pdf44.accent} />
          <Text style={{fontSize: 15.5, fontWeight: '700', color: t.pdf44.text, marginTop: 10}}>
            {toolId === 'jpg2pdf' ? 'Add images' : 'Add a file'}
          </Text>
          <Text style={{fontSize: 12.5, color: t.pdf44.text3, marginTop: 3}}>Nothing is uploaded</Text>
        </Pressable>

        {/* Options */}
        <View style={[styles.options, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border}]}>
          <Text style={{fontSize: 13, fontWeight: '700', color: t.pdf44.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4}}>Options</Text>
          <Checkbox checked={removeMeta} label="Remove metadata" onToggle={() => setRemoveMeta(v => !v)} />
          <Checkbox checked={keepOriginal} label="Keep original file" onToggle={() => setKeepOriginal(v => !v)} />
        </View>

        {!real && (
          <View style={[styles.note, {backgroundColor: t.pdf44.bg3}]}>
            <Icon name="shield_check" size={16} color={t.pdf44.warning} />
            <Text style={{fontSize: 12.5, color: t.pdf44.text3, flex: 1}}>
              This tool runs in preview mode in this build — its heavy on-device engine (rasteriser/OCR/docx) isn't bundled yet.
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={process}
          disabled={busy}
          contentStyle={{height: 52}}
          style={{borderRadius: 14, marginTop: 18}}
          labelStyle={{fontSize: 16, fontWeight: '700'}}>
          {busy ? 'Processing…' : 'Process'}
        </Button>
        {busy && <ActivityIndicator style={{marginTop: 16}} color={t.pdf44.accent} />}
        <Text style={{textAlign: 'center', fontSize: 12.5, color: t.pdf44.text3, marginTop: 16}}>No file ever leaves your phone</Text>
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18},
  idIcon: {width: 56, height: 56, alignItems: 'center', justifyContent: 'center'},
  upload: {borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, alignItems: 'center', paddingVertical: 34},
  options: {borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16, gap: 6},
  check: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8},
  box: {width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  note: {flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 16},
});
