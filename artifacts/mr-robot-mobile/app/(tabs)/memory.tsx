import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import type { Memory } from '@/types';

const CATEGORIES = ['system', 'behavior', 'general', 'personal', 'technical'];

export default function MemoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = useTabBarPadding(16);
  const { memories, addMemory, updateMemory, deleteMemory } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Memory | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');

  const openAdd = () => {
    setEditTarget(null);
    setTitle('');
    setContent('');
    setCategory('general');
    setShowModal(true);
  };

  const openEdit = (memory: Memory) => {
    setEditTarget(memory);
    setTitle(memory.title);
    setContent(memory.content);
    setCategory(memory.category);
    setShowModal(true);
  };

  const save = () => {
    if (!title.trim() || !content.trim()) return;
    const now = new Date().toISOString();
    if (editTarget) {
      updateMemory(editTarget.id, { title: title.trim(), content: content.trim(), category });
    } else {
      addMemory({ id: `m_${Date.now()}`, title: title.trim(), content: content.trim(), category, active: true, createdAt: now, updatedAt: now });
    }
    setShowModal(false);
  };

  const confirmDelete = (memory: Memory) => {
    Alert.alert('Delete memory', `Delete "${memory.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMemory(memory.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Memory</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {memories.filter(memory => memory.active).length} active context{memories.filter(memory => memory.active).length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={memories}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardMeta}>
                <View style={[styles.categoryDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.cardCategory, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{item.category}</Text>
              </View>
              <View style={styles.cardActions}>
                <Switch value={item.active} onValueChange={active => updateMemory(item.id, { active })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}><Feather name="edit-2" size={14} color={colors.mutedForeground} /></TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn}><Feather name="trash-2" size={14} color={colors.mutedForeground} /></TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: item.active ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{item.title}</Text>
            <Text style={[styles.cardContent, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="database" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No memories yet</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{editTarget ? 'Edit Memory' : 'New Memory'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>TITLE</Text>
            <TextInput style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]} value={title} onChangeText={setTitle} placeholder="Memory title" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>CONTENT</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]} value={content} onChangeText={setContent} placeholder="Memory content..." placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" />

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>CATEGORY</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.categoryChip, { backgroundColor: category === cat ? colors.primary : colors.background, borderColor: category === cat ? colors.primary : colors.border }]} onPress={() => setCategory(cat)}>
                  <Text style={[styles.categoryChipText, { color: category === cat ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: title.trim() && content.trim() ? colors.primary : colors.muted }]} onPress={save}>
              <Text style={[styles.saveBtnText, { color: title.trim() && content.trim() ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{editTarget ? 'Save Changes' : 'Add Memory'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28, marginBottom: 2 },
  subtitle: { fontSize: 13 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: 16, marginVertical: 6, borderRadius: 12, padding: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  cardCategory: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 4 },
  cardTitle: { fontSize: 15, marginBottom: 4 },
  cardContent: { fontSize: 13, lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, margin: 16, marginBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18 },
  label: { fontSize: 11, letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textArea: { height: 100, paddingTop: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 12 },
  saveBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 16 },
});
