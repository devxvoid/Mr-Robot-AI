import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import type { Conversation } from '@/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ConversationRow({
  conv,
  isActive,
  onPress,
  onDelete,
  onPin,
}: {
  conv: Conversation;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const colors = useColors();
  const lastMsg = conv.messages[conv.messages.length - 1];
  const msgCount = conv.messages.length;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isActive && { backgroundColor: colors.primary + '0d' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border }]}>
        <Feather name="message-square" size={15} color={isActive ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowTitleRow}>
          <Text
            style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
            numberOfLines={1}
          >
            {conv.title}
          </Text>
          {conv.pinned && (
            <Feather name="bookmark" size={11} color={colors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>
        {lastMsg ? (
          <Text
            style={[styles.rowPreview, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
            numberOfLines={1}
          >
            {lastMsg.role === 'user' ? 'You: ' : ''}{lastMsg.content || '...'}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowTime, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {formatDate(conv.updatedAt)}
        </Text>
        <Text style={[styles.msgCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {msgCount} msg{msgCount !== 1 ? 's' : ''}
        </Text>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={onPin} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <Feather name={conv.pinned ? 'bookmark' : 'bookmark'} size={14}
              color={conv.pinned ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    conversations, deleteConversation, clearAllConversations,
    updateConversation, setActiveConversationId, activeConversationId,
  } = useApp();

  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? conversations.filter(
          c => c.title.toLowerCase().includes(q) ||
            c.messages.some(m => m.content.toLowerCase().includes(q))
        )
      : conversations;
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations, search]);

  const handleOpen = useCallback((id: string) => {
    setActiveConversationId(id);
    router.navigate('/');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert('Delete conversation', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteConversation(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, []);

  const handlePin = useCallback((id: string, pinned: boolean) => {
    updateConversation(id, { pinned: !pinned });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Conversations',
      `This will permanently delete all ${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAllConversations();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }, [conversations.length]);

  const TAB_BAR_H = Platform.OS === 'ios' ? insets.bottom + 49 : 60 + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              History
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {conversations.length > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: colors.border }]}
              onPress={handleClearAll}
            >
              <Feather name="trash" size={14} color={colors.mutedForeground} />
              <Text style={[styles.clearBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search bar */}
        {conversations.length > 0 && (
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={14} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search conversations..."
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="clock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {search ? 'No matching conversations' : 'No conversations yet'}
          </Text>
          {!search && (
            <Text style={[styles.emptyHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Start chatting to see history here
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: TAB_BAR_H + 16 }}
          renderItem={({ item }) => (
            <ConversationRow
              conv={item}
              isActive={item.id === activeConversationId}
              onPress={() => handleOpen(item.id)}
              onDelete={() => handleDelete(item.id, item.title)}
              onPin={() => handlePin(item.id, item.pinned)}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  clearBtnText: { fontSize: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 14, flexShrink: 1 },
  rowPreview: { fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  rowTime: { fontSize: 11 },
  msgCount: { fontSize: 10 },
  rowActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 15, marginTop: 8 },
  emptyHint: { fontSize: 13 },
});
