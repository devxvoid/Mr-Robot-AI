import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import type { Skill } from '@/types';

function generateSkillId(): string {
  return `skill_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function SkillEditor({
  visible,
  existing,
  onClose,
  onSave,
}: {
  visible: boolean;
  existing: Skill | null;
  onClose: () => void;
  onSave: (skill: Skill) => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'custom');
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');

  React.useEffect(() => {
    if (!visible) return;
    setTitle(existing?.title ?? '');
    setCategory(existing?.category ?? 'custom');
    setSummary(existing?.summary ?? '');
    setInstructions(existing?.instructions ?? '');
  }, [visible, existing]);

  const handleSave = () => {
    if (!title.trim() || !summary.trim() || !instructions.trim()) {
      Alert.alert('Missing fields', 'Title, summary, and instructions are required.');
      return;
    }

    const timestamp = new Date().toISOString();
    onSave({
      id: existing?.id ?? generateSkillId(),
      title: title.trim(),
      category: category.trim() || 'custom',
      summary: summary.trim(),
      instructions: instructions.trim(),
      version: existing?.version ?? '1.0.0',
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                {existing ? 'Edit Skill' : 'Add Skill'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Kotlin Debugger"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
            />

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>CATEGORY</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="engineering"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
            />

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>SUMMARY</Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder="Short description of what this skill does"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[styles.input, styles.textAreaSmall, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
            />

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>INSTRUCTIONS</Text>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Reusable behavior rules injected into the chat system prompt"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textArea, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>Save Skill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SkillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { skills, addSkill, updateSkill, deleteSkill, resetSkills } = useApp();
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);

  const filteredSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(skill =>
      [skill.title, skill.summary, skill.category, skill.instructions]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [skills, query]);

  const activeCount = skills.filter(skill => skill.active).length;
  const TAB_BAR_H = Platform.OS === 'ios' ? insets.bottom + 49 : 60 + insets.bottom;

  const handleSaveSkill = (skill: Skill) => {
    if (editing) {
      updateSkill(skill.id, skill);
    } else {
      addSkill(skill);
    }
    setEditorOpen(false);
    setEditing(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (skill: Skill) => {
    Alert.alert('Delete skill', `Delete "${skill.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSkill(skill.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Reset skills', 'Restore the default Hermes-style skills?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          resetSkills();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: TAB_BAR_H + 18 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Skills</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {activeCount} active · {skills.length} total
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.primary }]}
          onPress={() => { setEditing(null); setEditorOpen(true); }}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
          <Text style={[styles.headerBtnText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search skills"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
        />
      </View>

      <View style={styles.infoCardWrap}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="zap" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Active skills are injected into the chat system prompt, giving Mr. Robot reusable Hermes-style behavior without hardcoding every workflow.</Text>
        </View>
      </View>

      <View style={styles.skillList}>
        {filteredSkills.map(skill => (
          <View key={skill.id} style={[styles.skillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.skillHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.skillTitleRow}>
                  <Text style={[styles.skillTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>{skill.title}</Text>
                  <View style={[styles.badge, { borderColor: colors.primary, backgroundColor: colors.primary + '16' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{skill.category}</Text>
                  </View>
                </View>
                <Text style={[styles.skillVersion, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>v{skill.version}</Text>
              </View>
              <Switch
                value={skill.active}
                onValueChange={active => updateSkill(skill.id, { active })}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>

            <Text style={[styles.skillSummary, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{skill.summary}</Text>
            <Text style={[styles.skillInstructions, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={4}>{skill.instructions}</Text>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.cardBtn, { borderColor: colors.border }]}
                onPress={() => { setEditing(skill); setEditorOpen(true); }}
              >
                <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                <Text style={[styles.cardBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cardBtn, { borderColor: colors.border }]} onPress={() => handleDelete(skill)}>
                <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                <Text style={[styles.cardBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={handleReset}>
        <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Restore default skills</Text>
      </TouchableOpacity>

      <SkillEditor
        visible={editorOpen}
        existing={editing}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        onSave={handleSaveSkill}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { fontSize: 13 },
  searchBox: {
    marginHorizontal: 16, marginTop: 14, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  infoCardWrap: { paddingHorizontal: 16, paddingTop: 12 },
  infoCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { fontSize: 13, lineHeight: 19, flex: 1 },
  skillList: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  skillCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14 },
  skillHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  skillTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillTitle: { fontSize: 16, flexShrink: 1 },
  skillVersion: { fontSize: 12, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  badgeText: { fontSize: 10 },
  skillSummary: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  skillInstructions: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cardBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  cardBtnText: { fontSize: 12 },
  resetBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  resetText: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, margin: 16, marginBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18 },
  label: { fontSize: 11, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textAreaSmall: { minHeight: 74 },
  textArea: { minHeight: 140 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  secondaryBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 14 },
  primaryBtn: { flex: 1.5, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { fontSize: 15 },
});
