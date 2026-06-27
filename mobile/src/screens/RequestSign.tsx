import React, {useState} from 'react';
import {View, Text, Pressable, TextInput, StyleSheet} from 'react-native';
import {useTheme, Switch, Button} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar, Body} from '../components/Chrome';
import {DocThumb} from '../components/Files';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';

const COLORS = ['#e5322d', '#3b82f6', '#22c55e', '#8b5cf6', '#f97316'];
interface Recipient {id: number; name: string; email: string}

export default function RequestSign() {
  const t = useTheme() as AppTheme;
  const {params, back} = useApp();
  const {showToast} = useToast();
  const [ordered, setOrdered] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([
    {id: 1, name: 'Jordan Lee', email: 'jordan@example.com'},
    {id: 2, name: '', email: ''},
  ]);

  const update = (id: number, patch: Partial<Recipient>) => setRecipients(rs => rs.map(r => (r.id === id ? {...r, ...patch} : r)));
  const remove = (id: number) => setRecipients(rs => rs.filter(r => r.id !== id));
  const add = () => setRecipients(rs => [...rs, {id: Math.max(0, ...rs.map(r => r.id)) + 1, name: '', email: ''}]);

  const valid = recipients.filter(r => r.email.trim()).length;

  return (
    <View style={{flex: 1}}>
      <TopAppBar title="Request signatures" large onBack={back} />
      <Body contentStyle={{padding: 18, paddingBottom: 60}}>
        {/* document chip */}
        <View style={[styles.docChip, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border}]}>
          <DocThumb w={40} accent={params?.accent || t.pdf44.accent} seed={0} />
          <View style={{flex: 1}}>
            <Text style={{fontSize: 14.5, fontWeight: '700', color: t.pdf44.text}}>{params?.name || 'Lease Agreement.pdf'}</Text>
            <Text style={{fontSize: 12, color: t.pdf44.text3, marginTop: 2}}>12 pages · 1 signature field</Text>
          </View>
        </View>

        <Text style={{fontSize: 15.5, fontWeight: '700', color: t.pdf44.text, marginTop: 22, marginBottom: 10}}>Recipients</Text>
        {recipients.map((r, i) => (
          <View key={r.id} style={[styles.card, {backgroundColor: t.pdf44.bg2, borderColor: t.pdf44.border}]}>
            <View style={[styles.avatar, {backgroundColor: COLORS[i % COLORS.length]}]}>
              <Text style={{color: '#fff', fontWeight: '700'}}>{ordered ? i + 1 : (r.name.trim()[0] || '?').toUpperCase()}</Text>
            </View>
            <View style={{flex: 1, gap: 8}}>
              <TextInput value={r.name} onChangeText={v => update(r.id, {name: v})} placeholder="Full name" placeholderTextColor={t.pdf44.text3} style={[styles.input, {color: t.pdf44.text, borderColor: t.pdf44.border}]} />
              <TextInput value={r.email} onChangeText={v => update(r.id, {email: v})} placeholder="Email" placeholderTextColor={t.pdf44.text3} keyboardType="email-address" autoCapitalize="none" style={[styles.input, {color: t.pdf44.text, borderColor: t.pdf44.border}]} />
            </View>
            <Pressable onPress={() => remove(r.id)} hitSlop={8}><Icon name="close" size={20} color={t.pdf44.text3} /></Pressable>
          </View>
        ))}
        <Pressable onPress={add} style={[styles.addRecipient, {borderColor: t.pdf44.borderStrong}]}>
          <Icon name="plus" size={20} color={t.pdf44.accent} />
          <Text style={{fontSize: 14, fontWeight: '600', color: t.pdf44.accent}}>Add recipient</Text>
        </Pressable>

        <View style={[styles.orderRow, {borderColor: t.pdf44.border, backgroundColor: t.pdf44.bg2}]}>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 15, fontWeight: '600', color: t.pdf44.text}}>Set signing order</Text>
            <Text style={{fontSize: 12.5, color: t.pdf44.text3, marginTop: 2}}>Recipients sign one after another</Text>
          </View>
          <Switch value={ordered} onValueChange={setOrdered} />
        </View>

        <Button
          mode="contained"
          disabled={!valid}
          onPress={() => { showToast('Sending signature requests needs an account/server — not available in this build yet', 'shield_check'); }}
          contentStyle={{height: 52}}
          style={{borderRadius: 14, marginTop: 22}}
          labelStyle={{fontWeight: '700', fontSize: 16}}>
          Send request
        </Button>
        <Text style={{textAlign: 'center', fontSize: 12, color: t.pdf44.text3, marginTop: 14}}>Audit trail kept on-device</Text>
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  docChip: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1},
  card: {flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12, alignItems: 'flex-start'},
  avatar: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  input: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14},
  addRecipient: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed'},
  orderRow: {flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 18},
});
