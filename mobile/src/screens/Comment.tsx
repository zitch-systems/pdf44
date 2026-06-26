import React, {useState} from 'react';
import {View, Text, Pressable, ScrollView, TextInput, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {AppTheme} from '../theme/theme';
import {TopAppBar} from '../components/Chrome';
import {BottomSheet} from '../components/Sheet';
import Icon from '../components/Icon';
import {useApp, useToast} from '../state/store';

const MARKUP = [
  {id: 'highlight', icon: 'highlight', label: 'Highlight', color: '#eab308'},
  {id: 'underline', icon: 'underline', label: 'Underline', color: '#3b82f6'},
  {id: 'strike', icon: 'strike', label: 'Strike', color: '#ef4444'},
  {id: 'note', icon: 'note', label: 'Note', color: '#f97316'},
  {id: 'draw', icon: 'draw', label: 'Draw', color: '#8b5cf6'},
  {id: 'text', icon: 'text', label: 'Text', color: '#22c55e'},
];

const AVATARS = ['#e5322d', '#3b82f6', '#22c55e', '#8b5cf6'];
interface CommentT {author: string; initials: string; time: string; text: string; color: string}

export default function Comment() {
  const t = useTheme() as AppTheme;
  const {back} = useApp();
  const {showToast} = useToast();
  const [tool, setTool] = useState('highlight');
  const [panel, setPanel] = useState(false);
  const [draft, setDraft] = useState('');
  const [comments, setComments] = useState<CommentT[]>([
    {author: 'Alex Cole', initials: 'AC', time: '2h ago', text: 'Please confirm the renewal date in section 4.', color: '#e5322d'},
    {author: 'Jordan Lee', initials: 'JL', time: '1h ago', text: 'Looks good — signing today.', color: '#3b82f6'},
  ]);

  const active = MARKUP.find(m => m.id === tool)!;

  const add = () => {
    if (!draft.trim()) return;
    setComments(c => [...c, {author: 'Alex Cole', initials: 'AC', time: 'now', text: draft.trim(), color: AVATARS[c.length % AVATARS.length]}]);
    setDraft('');
    showToast('Comment added', 'comment');
  };

  return (
    <View style={{flex: 1}}>
      <TopAppBar
        title="Comment"
        onBack={back}
        actions={[
          {icon: 'comment', label: 'Comments', onPress: () => setPanel(true)},
          {icon: 'install', label: 'Done', primary: true, onPress: () => { showToast('Markup saved', 'check'); back(); }},
        ]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingHorizontal: 14, paddingVertical: 10}} style={{flexGrow: 0}}>
        {MARKUP.map(m => (
          <Pressable key={m.id} onPress={() => setTool(m.id)} style={[styles.tool, {backgroundColor: tool === m.id ? t.pdf44.accentGlow : t.pdf44.bg2, borderColor: tool === m.id ? t.pdf44.accent : t.pdf44.border}]}>
            <Icon name={m.icon} size={18} color={m.color} />
            <Text style={{fontSize: 12.5, color: t.pdf44.text2, fontWeight: '600'}}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{flex: 1, backgroundColor: t.pdf44.bg3}} contentContainerStyle={{padding: 20, alignItems: 'center'}}>
        <View style={styles.page}>
          <View style={{height: 8, backgroundColor: t.pdf44.accent}} />
          <View style={{padding: 20}}>
            <View style={{height: 12, width: '50%', backgroundColor: '#e7e9ef', borderRadius: 4, marginBottom: 18}} />
            {/* highlight band */}
            <View style={{backgroundColor: 'rgba(234,179,8,0.4)', paddingVertical: 2, marginBottom: 8}}><View style={{height: 7, width: '80%', backgroundColor: '#d1d5db', borderRadius: 3}} /></View>
            {/* underline */}
            <View style={{borderBottomWidth: 2, borderColor: '#3b82f6', paddingBottom: 3, marginBottom: 12, width: '70%'}}><View style={{height: 7, backgroundColor: '#e7e9ef', borderRadius: 3}} /></View>
            {Array.from({length: 6}).map((_, i) => <View key={i} style={{height: 7, backgroundColor: '#eef0f5', borderRadius: 3, marginBottom: 9, width: `${90 - (i % 3) * 14}%`}} />)}
            {/* sticky note pin */}
            <View style={{position: 'absolute', right: 16, top: 60, width: 26, height: 26, borderRadius: 6, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center'}}>
              <Icon name="note" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.addBar, {backgroundColor: t.pdf44.bg2, borderTopColor: t.pdf44.border}]}>
        <Text style={{flex: 1, color: t.pdf44.text3, fontSize: 13.5}}>Tap the page to add a {active.label.toLowerCase()}</Text>
        <Pressable onPress={() => showToast(active.label + ' added', active.icon)} style={[styles.addBtn, {backgroundColor: t.pdf44.accent}]}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 13.5}}>Add</Text>
        </Pressable>
      </View>

      <BottomSheet visible={panel} onClose={() => setPanel(false)}>
        <Text style={{fontSize: 16, fontWeight: '700', color: t.pdf44.text, paddingHorizontal: 16, paddingBottom: 10}}>Comments · {comments.length}</Text>
        <ScrollView style={{maxHeight: 300}}>
          {comments.map((c, i) => (
            <View key={i} style={{flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10}}>
              <View style={{width: 36, height: 36, borderRadius: 18, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}>{c.initials}</Text>
              </View>
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
                  <Text style={{fontSize: 14, fontWeight: '700', color: t.pdf44.text}}>{c.author}</Text>
                  <Text style={{fontSize: 11.5, color: t.pdf44.text3}}>{c.time}</Text>
                </View>
                <Text style={{fontSize: 13.5, color: t.pdf44.text2, marginTop: 2}}>{c.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{flexDirection: 'row', gap: 10, padding: 16, alignItems: 'center'}}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Add a comment…" placeholderTextColor={t.pdf44.text3} style={{flex: 1, backgroundColor: t.pdf44.bg3, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: t.pdf44.text}} />
          <Pressable onPress={add} style={[styles.addBtn, {backgroundColor: t.pdf44.accent}]}><Text style={{color: '#fff', fontWeight: '700'}}>Send</Text></Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  tool: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1},
  page: {width: 330, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 4}},
  addBar: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1},
  addBtn: {paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999},
});
