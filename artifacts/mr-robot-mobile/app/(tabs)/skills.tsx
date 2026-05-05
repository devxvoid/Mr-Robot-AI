import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import type { Skill } from '@/types';

function makeId() {
  return `skill_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function SkillEditor({ visible, existing, onClose, onSave }: {
  visible: boolean;
  existing: Skill | null;
  onClose: () => void;
  onSave: (skill: Skill) => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('custom');
  const [summary, setSummary] = useState('');
  const [instructions, setInstructions] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setTitle(existing?.title ?? '');
    setCategory(existing?.category ?? 'custom');
    setSummary(existing?.summary ?? '');
    setInstructions(existing?.instructions ?? '');
  }, [visible, existing]);

  const save = () => {
    if (!title.trim() || !summary.trim() || !instructions.trim()) {
      Alert.alert('Missing fields', 'Title, summary, and instructions are required.');
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: existing?.id ?? makeId(),
      title: title.trim(),
      category: category.trim() || 'custom',
      summary: summary.trim(),
      instructions: instructions.trim(),
      version: existing?.version ?? '1.0.0',
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{existing ? 'Edit Skill' : 'Add Skill'}</Text>
              <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            <Field label="TITLE" value={title} onChangeText={setTitle} placeholder="Skill title" />
            <Field label="CATEGORY" value={category} onChangeText={setCategory} placeholder="custom" />
            <Field label="SUMMARY" value={summary} onChangeText={setSummary} placeholder="Short summary" multiline />
            <Field label="INSTRUCTIONS" value={instructions} onChangeText={setInstructions} placeholder="Reusable instructions" multiline tall />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.secondary, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary }]} onPress={save}>
                <Text style={[styles.btnText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, tall, ...props }: { label: string; tall?: boolean; value: string; onChangeText: (v: string) => void; placeholder: string; multiline?: boolean }) {
  const colors = useColors();
  return (
    <>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.mutedForeground}
        textAlignVertical={props.multiline ? 'top' : 'center'}
        style={[styles.input, tall && styles.tallInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
      />
    </>
  );
}

export default function SkillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = useTabBarPadding(18);
  const { skills, addSkill, updateSkill, deleteSkill, resetSkills } = useApp();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Skill | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const visibleSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(s => `${s.title} ${s.category} ${s.summary} ${s.instructions}`.toLowerCase().includes(q));
  }, [skills, query]);

  const saveSkill = (skill: Skill) => {
    if (editing) updateSkill(skill.id, skill);
    else addSkill(skill);
    setEditing(null);
    setEditorOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeSkill = (skill: Skill) => {
    Alert.alert('Delete skill', `Delete "${skill.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSkill(skill.id) },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: bottomPadding }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Skills</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{skills.filter(s => s.active).length} active · {skills.length} total</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setEditing(null); setEditorOpen(true); }}>
          <Feather name="plus" size={16} color={colors.primaryForeground} />
          <Text style={[styles.addText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search skills" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]} />
      </View>

      <View style={styles.list}>
        {visibleSkills.map(skill => (
          <View key={skill.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>{skill.title}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{skill.category} · v{skill.version}</Text>
              </View>
              <Switch value={skill.active} onValueChange={active => updateSkill(skill.id, { active })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
            <Text style={[styles.summary, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{skill.summary}</Text>
            <Text style={[styles.instructions, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={4}>{skill.instructions}</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} onPress={() => { setEditing(skill); setEditorOpen(true); }}><Text style={[styles.smallBtnText, { color: colors.mutedForeground }]}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.border }]} onPress={() => removeSkill(skill)}><Text style={[styles.smallBtnText, { color: colors.mutedForeground }]}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={resetSkills}>
        <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Restore default skills</Text>
      </TouchableOpacity>

      <SkillEditor visible={editorOpen} existing={editing} onClose={() => { setEditing(null); setEditorOpen(false); }} onSave={saveSkill} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addText: { fontSize: 13 },
  searchBox: { marginHorizontal: 16, marginTop: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16 },
  meta: { fontSize: 12, marginTop: 2 },
  summary: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  instructions: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  smallBtnText: { fontSize: 12 },
  resetBtn: { alignSelf: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  resetText: { fontSize: 13 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, margin: 16, marginBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18 },
  label: { fontSize: 11, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  tallInput: { minHeight: 120 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  secondary: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  primary: { flex: 1.5, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 14 },
});
