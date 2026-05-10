import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { DEFAULT_BASE_URLS, DEFAULT_MODELS, pingProvider } from '@/lib/ai';
import type { AIProvider } from '@/types';

type ProviderType = AIProvider['type'];

const PROVIDER_TYPES: { type: ProviderType; label: string }[] = [
  { type: 'openrouter', label: 'OpenRouter' },
  { type: 'openai-compatible', label: 'OpenAI / Compatible' },
  { type: 'anthropic', label: 'Anthropic' },
  { type: 'gemini', label: 'Google Gemini' },
];

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
      {title}
    </Text>
  );
}

function Row({
  label, value, onPress, right, destructive,
}: {
  label: string; value?: string; onPress?: () => void;
  right?: React.ReactNode; destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[
        styles.rowLabel,
        { color: destructive ? colors.destructive : colors.foreground, fontFamily: 'Inter_400Regular' },
      ]}>
        {label}
      </Text>
      {right ?? (
        value !== undefined && (
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {value}
            </Text>
            {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
          </View>
        )
      )}
    </TouchableOpacity>
  );
}

function StatusDot({ status }: { status: 'not_configured' | 'connected' | 'error' }) {
  const colors = useColors();
  const color = status === 'connected' ? '#22c55e' : status === 'error' ? colors.destructive : colors.mutedForeground;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function ProviderModal({
  visible, onClose, onSave, existing,
}: {
  visible: boolean; onClose: () => void;
  onSave: (p: AIProvider) => void; existing?: AIProvider | null;
}) {
  const colors = useColors();
  const [type, setType] = useState<ProviderType>('openrouter');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (visible) {
      if (existing) {
        setType(existing.type);
        setName(existing.name);
        setApiKey(existing.apiKey);
        setBaseUrl(existing.baseUrl);
        setModel(existing.selectedModel);
      } else {
        setType('openrouter');
        setName('');
        setApiKey('');
        setBaseUrl(DEFAULT_BASE_URLS['openrouter'] ?? '');
        setModel(DEFAULT_MODELS['openrouter']?.[0] ?? '');
      }
      setTestResult(null);
    }
  }, [visible, existing]);

  const handleTypeChange = useCallback((t: ProviderType) => {
    setType(t);
    setBaseUrl(DEFAULT_BASE_URLS[t] ?? '');
    setModel(DEFAULT_MODELS[t]?.[0] ?? '');
    setTestResult(null);
  }, []);

  const models = DEFAULT_MODELS[type] ?? [];

  const handleSave = () => {
    if (!name.trim() || !apiKey.trim()) {
      Alert.alert('Missing fields', 'Provider name and API key are required.');
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: existing?.id ?? `prov_${Date.now()}`,
      name: name.trim(),
      type,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || (DEFAULT_BASE_URLS[type] ?? ''),
      selectedModel: model.trim() || (DEFAULT_MODELS[type]?.[0] ?? ''),
      enabled: true,
      status: testResult?.ok ? 'connected' : 'not_configured',
      createdAt: existing?.createdAt ?? now,
    });
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Enter an API key to test the connection.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await pingProvider({
      id: 'test',
      name: name || 'test',
      type,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || (DEFAULT_BASE_URLS[type] ?? ''),
      selectedModel: model || (DEFAULT_MODELS[type]?.[0] ?? ''),
      enabled: true,
      status: 'not_configured',
      createdAt: new Date().toISOString(),
    });
    setTesting(false);
    setTestResult(result);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView
          contentContainerStyle={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                {existing ? 'Edit Provider' : 'Add AI Provider'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Provider type */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              PROVIDER TYPE
            </Text>
            <View style={styles.typeRow}>
              {PROVIDER_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.type}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: type === pt.type ? colors.primary : colors.background,
                      borderColor: type === pt.type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleTypeChange(pt.type)}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: type === pt.type ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_500Medium' },
                  ]}>
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. My GPT-4"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />

            {/* API Key */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>API KEY</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
              value={apiKey}
              onChangeText={v => { setApiKey(v); setTestResult(null); }}
              placeholder={type === 'anthropic' ? 'sk-ant-...' : type === 'gemini' ? 'AIza...' : type === 'openrouter' ? 'sk-or-...' : 'sk-...'}
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            {/* Base URL (not for Gemini or OpenRouter — they have fixed endpoints) */}
            {type !== 'gemini' && type !== 'openrouter' && (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>BASE URL</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
                  value={baseUrl}
                  onChangeText={setBaseUrl}
                  placeholder={DEFAULT_BASE_URLS[type] || 'https://api.openai.com/v1'}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="next"
                />
              </>
            )}

            {/* Model */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>MODEL</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
              value={model}
              onChangeText={setModel}
              placeholder={models[0] || 'model name'}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />

            {/* Quick select models */}
            {models.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>QUICK SELECT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                    {models.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.modelChip,
                          {
                            backgroundColor: model === m ? colors.primary : colors.background,
                            borderColor: model === m ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setModel(m)}
                      >
                        <Text style={[styles.modelChipText, { color: model === m ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Test result */}
            {testResult !== null && (
              <View style={[
                styles.testResult,
                { backgroundColor: testResult.ok ? '#00FF4110' : colors.destructive + '15', borderColor: testResult.ok ? '#00FF41' : colors.destructive },
              ]}>
                <Feather name={testResult.ok ? 'check-circle' : 'alert-circle'} size={14} color={testResult.ok ? '#00FF41' : colors.destructive} />
                <Text style={[
                  styles.testResultText,
                  { color: testResult.ok ? '#00FF41' : colors.destructive, fontFamily: 'Inter_400Regular' },
                ]}>
                  {testResult.ok ? 'Connection successful' : testResult.error ?? 'Connection failed'}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.testBtn, { borderColor: colors.border }]}
                onPress={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <Feather name="wifi" size={14} color={colors.mutedForeground} />
                )}
                <Text style={[styles.testBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  {existing ? 'Save Changes' : 'Add Provider'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, providers, addProvider, updateProvider, deleteProvider } = useApp();

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [agentNameEdit, setAgentNameEdit] = useState(false);
  const [agentNameVal, setAgentNameVal] = useState(settings.agentName);

  const TAB_BAR_H = Platform.OS === 'ios' ? insets.bottom + 49 : 60 + insets.bottom;

  const handleSaveProvider = useCallback((p: AIProvider) => {
    if (editingProvider) {
      updateProvider(p.id, p);
    } else {
      addProvider(p);
      if (!settings.activeProviderId) {
        updateSettings({ activeProviderId: p.id, activeModelId: p.selectedModel });
      }
    }
    setShowProviderModal(false);
    setEditingProvider(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editingProvider, settings.activeProviderId]);

  const handleDeleteProvider = useCallback((id: string, name: string) => {
    Alert.alert('Remove provider', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          deleteProvider(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, []);

  const RESPONSE_STYLES = ['concise', 'balanced', 'detailed'] as const;
  const activeProvider = providers.find(p => p.id === settings.activeProviderId);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: TAB_BAR_H + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Settings
        </Text>
      </View>

      {/* Agent */}
      <SectionHeader title="AGENT" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {agentNameEdit ? (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <TextInput
              style={[styles.inlineInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={agentNameVal}
              onChangeText={setAgentNameVal}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={() => {
                updateSettings({ agentName: agentNameVal.trim() || 'Mr. Robot' });
                setAgentNameEdit(false);
              }}
            />
            <TouchableOpacity onPress={() => {
              updateSettings({ agentName: agentNameVal.trim() || 'Mr. Robot' });
              setAgentNameEdit(false);
            }}>
              <Feather name="check" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Row
            label="Agent Name"
            value={settings.agentName}
            onPress={() => { setAgentNameVal(settings.agentName); setAgentNameEdit(true); }}
          />
        )}
        <Row
          label="Response Style"
          value={settings.responseStyle}
          onPress={() => {
            const idx = RESPONSE_STYLES.indexOf(settings.responseStyle);
            updateSettings({ responseStyle: RESPONSE_STYLES[(idx + 1) % 3] });
          }}
        />
      </View>

      {/* Appearance */}
      <SectionHeader title="APPEARANCE" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row
          label="Theme"
          value={settings.theme === 'system' ? 'System' : settings.theme === 'light' ? 'Light' : 'Dark'}
          onPress={() => {
            const themes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
            const idx = themes.indexOf(settings.theme);
            const next = themes[(idx + 1) % themes.length];
            updateSettings({ theme: next });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
        <Row label="AMOLED Black Background" right={
          <Switch
            value={settings.amoledBlack}
            onValueChange={v => updateSettings({ amoledBlack: v })}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        } />
        <Row
          label="Hacker Mode"
          value={settings.hackerMode ? 'Matrix green on' : 'Off'}
          right={
            <Switch
              value={settings.hackerMode}
              onValueChange={v => updateSettings({ hackerMode: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          }
        />
        <Row label="Streaming Responses" right={
          <Switch
            value={settings.streamingEnabled}
            onValueChange={v => updateSettings({ streamingEnabled: v })}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        } />
      </View>

      {/* AI Providers */}
      <SectionHeader title="AI PROVIDERS" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {providers.length === 0 ? (
          <View style={styles.noProviders}>
            <Text style={[styles.noProvidersText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              No providers configured. Add one to start chatting.
            </Text>
          </View>
        ) : (
          providers.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.providerRow,
                { borderBottomColor: colors.border },
                idx === providers.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.providerLeft}>
                <StatusDot status={p.status} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.providerNameRow}>
                    <Text style={[styles.providerName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {p.id === settings.activeProviderId && (
                      <View style={[styles.activeBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
                        <Text style={[styles.activeBadgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                          Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.providerMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                    {p.selectedModel} · {p.type}
                  </Text>
                </View>
              </View>
              <View style={styles.providerActions}>
                {p.id !== settings.activeProviderId && (
                  <TouchableOpacity
                    style={[styles.activateBtn, { borderColor: colors.primary }]}
                    onPress={() => updateSettings({ activeProviderId: p.id, activeModelId: p.selectedModel })}
                  >
                    <Text style={[styles.activateBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                      Use
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => { setEditingProvider(p); setShowProviderModal(true); }}
                  style={styles.iconBtn}
                >
                  <Feather name="edit-2" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteProvider(p.id, p.name)}
                  style={styles.iconBtn}
                >
                  <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <TouchableOpacity
          style={[styles.addProviderBtn, { borderTopColor: colors.border }]}
          onPress={() => { setEditingProvider(null); setShowProviderModal(true); }}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addProviderText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
            Add AI Provider
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Model */}
      {activeProvider && (
        <>
          <SectionHeader title="ACTIVE MODEL" />
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Row label="Provider" value={activeProvider.name} />
            <Row
              label="Model"
              value={activeProvider.selectedModel}
              onPress={() => {
                const mdls = DEFAULT_MODELS[activeProvider.type] ?? [];
                const idx = mdls.indexOf(activeProvider.selectedModel);
                const next = mdls[(idx + 1) % mdls.length];
                if (next) {
                  updateProvider(activeProvider.id, { selectedModel: next });
                  updateSettings({ activeModelId: next });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            />
          </View>
        </>
      )}

      {/* About */}
      <SectionHeader title="ABOUT" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row label="Version" value="1.0.0" />
        <Row label="Build" value="prod" />
      </View>

      <ProviderModal
        visible={showProviderModal}
        onClose={() => { setShowProviderModal(false); setEditingProvider(null); }}
        onSave={handleSaveProvider}
        existing={editingProvider}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  title: { fontSize: 28 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  section: { marginHorizontal: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 15 },
  inlineInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  noProviders: { padding: 16 },
  noProvidersText: { fontSize: 13, lineHeight: 20 },
  providerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  providerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  providerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { fontSize: 14, flexShrink: 1 },
  providerMeta: { fontSize: 12, marginTop: 1 },
  activeBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, flexShrink: 0,
  },
  activeBadgeText: { fontSize: 10 },
  providerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  activateBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginRight: 4 },
  activateBtnText: { fontSize: 12 },
  iconBtn: { padding: 6 },
  addProviderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  addProviderText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, margin: 16, marginBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18 },
  label: { fontSize: 11, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  typeChipText: { fontSize: 11 },
  modelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  modelChipText: { fontSize: 12 },
  testResult: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 14,
  },
  testResultText: { fontSize: 13, flex: 1, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  testBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1,
  },
  testBtnText: { fontSize: 14 },
  saveBtn: { flex: 1.6, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 15 },
});
