import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { sendMessage } from '@/lib/ai';
import type { Conversation, Message } from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateTitle(firstMessage: string): string {
  return firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
}

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Write a Python port scanner',
  'How does AES encryption work?',
  'Analyze this code for vulnerabilities',
  'Explain the OSI model',
];

function TypingDots() {
  const colors = useColors();
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const anim = (v: SharedValue<number>, delay: number) => {
      setTimeout(() => {
        v.value = withRepeat(
          withSequence(withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })),
          -1
        );
      }, delay);
    };
    anim(dot1, 0);
    anim(dot2, 200);
    anim(dot3, 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.dotsRow}>
      {[s1, s2, s3].map((s, i) => (
        <Animated.View key={i} style={[styles.dot, s, { backgroundColor: colors.primary }]} />
      ))}
    </View>
  );
}

const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: Message }) {
  const colors = useColors();
  const isUser = msg.role === 'user';
  const isThinking = !isUser && msg.isStreaming === true && msg.content === '';

  const handleLongPress = useCallback(async () => {
    if (!msg.content) return;
    await Clipboard.setStringAsync(msg.content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [msg.content]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify()}
      style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' }]}>
          <Text style={[styles.avatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>MR</Text>
        </View>
      )}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          pressed && styles.bubblePressed,
        ]}
      >
        {isThinking ? (
          <TypingDots />
        ) : (
          <Text
            style={[
              styles.messageText,
              {
                color: isUser ? colors.primaryForeground : colors.foreground,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            selectable
          >
            {msg.content}
            {msg.isStreaming && msg.content !== '' && (
              <Text style={{ color: colors.primary }}>▋</Text>
            )}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

function EmptyChat({ onSuggestionPress }: { onSuggestionPress: (s: string) => void }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.logoContainer, { borderColor: colors.primary + '55' }]}>
        <Text style={[styles.logoText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>MR</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
        Mr. Robot
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Advanced AI Operating System
      </Text>
      <View style={styles.suggestionsCol}>
        {SUGGESTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.suggestionChip, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => onSuggestionPress(s)}
            activeOpacity={0.7}
          >
            <Feather name="terminal" size={12} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.suggestionText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    conversations, activeConversationId, setActiveConversationId,
    addConversation, addMessage, updateMessage, updateConversation,
    activeProvider, settings, memories, skills,
  } = useApp();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (!activeProvider) {
      Alert.alert(
        'No AI Provider',
        'Please configure an AI provider in Settings → AI Providers before chatting.',
        [{ text: 'OK' }]
      );
      return;
    }

    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const prevMessages = (activeConversation?.messages ?? []).concat(userMsg);
    let convId = activeConversationId;

    if (!convId) {
      const newConv: Conversation = {
        id: generateId(),
        title: generateTitle(text),
        messages: [userMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: false,
      };
      addConversation(newConv);
      setActiveConversationId(newConv.id);
      convId = newConv.id;
    } else {
      addMessage(convId, userMsg);
    }

    const assistantMsgId = generateId();
    addMessage(convId, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    });

    setIsLoading(true);
    scrollToBottom();

    try {
      const activeMemories = memories.filter(m => m.active);
      const activeSkills = skills.filter(s => s.active);
      let msgContext = prevMessages.slice(-20);

      if (activeMemories.length > 0 && msgContext.length === 1) {
        const memCtx = activeMemories.map(m => `${m.title}: ${m.content}`).join('. ');
        msgContext = [{ ...msgContext[0], content: msgContext[0].content + '\n\n[Context: ' + memCtx + ']' }];
      }

      let accumulated = '';

      if (settings.streamingEnabled) {
        await sendMessage(msgContext, activeProvider, settings, (chunk) => {
          accumulated += chunk;
          updateMessage(convId!, assistantMsgId, { content: accumulated, isStreaming: true });
        }, { skills: activeSkills });
      } else {
        accumulated = await sendMessage(msgContext, activeProvider, settings, undefined, { skills: activeSkills });
      }

      updateMessage(convId!, assistantMsgId, {
        content: accumulated || '(empty response)',
        isStreaming: false,
      });

      const currentConv = conversations.find(c => c.id === convId);
      if (currentConv && currentConv.messages.length <= 2) {
        updateConversation(convId!, { title: generateTitle(text) });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      updateMessage(convId!, assistantMsgId, {
        content: `Error: ${msg}`,
        isStreaming: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, activeProvider, activeConversationId, activeConversation, conversations, settings, memories, skills]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setInput('');
  }, []);

  const handleSuggestion = useCallback((s: string) => {
    setInput(s);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const TAB_BAR_H = Platform.OS === 'ios' ? insets.bottom + 56 : 56;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerDot, { backgroundColor: activeProvider ? colors.primary : colors.mutedForeground }]} />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {settings.agentName}
          </Text>
          {activeConversation && (
            <Text style={[styles.headerConvTitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
              · {activeConversation.title}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.newChatBtn, { borderColor: colors.border }]}
          onPress={handleNewChat}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.newChatText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {messages.length === 0 && !isLoading ? (
        <EmptyChat onSuggestionPress={handleSuggestion} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.messageList, { paddingBottom: 12 }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
        />
      )}

      {/* No provider banner */}
      {!activeProvider && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.noProviderBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="alert-circle" size={13} color={colors.primary} />
          <Text style={[styles.noProviderText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            No AI provider — go to Settings to configure one
          </Text>
        </Animated.View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border, paddingBottom: TAB_BAR_H + 8 }]}>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
            value={input}
            onChangeText={setInput}
            placeholder={activeProvider ? 'Send a message...' : 'Configure a provider first...'}
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={8000}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !isLoading && activeProvider ? colors.primary : colors.muted,
              },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading || !activeProvider}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Feather
                name="send"
                size={16}
                color={input.trim() && activeProvider ? colors.primaryForeground : colors.mutedForeground}
              />
            )}
          </TouchableOpacity>
        </View>
        {input.length > 6000 && (
          <Text style={[styles.charCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {input.length}/8000
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 17 },
  headerConvTitle: { fontSize: 13, flex: 1 },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  newChatText: { fontSize: 13 },
  messageList: { paddingHorizontal: 16, paddingTop: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatar: {
    width: 30, height: 30, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 8 },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: { borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
  bubblePressed: { opacity: 0.8 },
  messageText: { fontSize: 15, lineHeight: 22 },
  dotsRow: { flexDirection: 'row', gap: 5, paddingVertical: 2, paddingHorizontal: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 10,
  },
  logoContainer: {
    width: 72, height: 72, borderRadius: 20, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  logoText: { fontSize: 20 },
  emptyTitle: { fontSize: 26 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  suggestionsCol: { width: '100%', gap: 8 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: { fontSize: 13, flex: 1 },
  noProviderBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 4, padding: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  noProviderText: { fontSize: 12, flex: 1 },
  inputContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 16,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 6,
  },
  input: { flex: 1, fontSize: 15, lineHeight: 21, maxHeight: 120, paddingVertical: 4 },
  sendBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4, marginRight: 4 },
});
