import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flask } from 'phosphor-react-native';
import {
  MOCK_API,
  MOCK_SCENARIOS,
  MOCK_SCENARIO_LABELS,
  mockCurrentScenario,
  mockSwitchScenario,
  type MockScenario,
} from '../../lib/api/devMock';
import { useAuthStore } from '../../features/auth/store';
import { queryClient } from '../../lib/query/queryClient';

// Dev-only floating button for jumping between lib/api/devMock.ts's test
// scenarios without editing code or reloading the app. Only ever rendered
// while MOCK_API is true (see app/_layout.tsx), so it never ships.
export default function ScenarioSwitcher() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<MockScenario>(mockCurrentScenario());

  if (!MOCK_API) return null;

  const handlePick = (scenario: MockScenario) => {
    const nextRider = mockSwitchScenario(scenario);
    setCurrent(scenario);
    setUser(nextRider);
    void queryClient.invalidateQueries();
    setOpen(false);
    router.replace('/home');
  };

  return (
    <>
      {/* Tucked into the status bar's own margin (above every screen's real
          content, which always starts at insets.top + padding) so this never
          sits on top of a header button or a bottom CTA on any screen. */}
      <TouchableOpacity
        style={[styles.fab, { top: Math.max(insets.top - 6, 4) }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Switch mock test scenario"
      >
        <Flask size={16} color="#fff" weight="fill" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.title}>Test scenario</Text>
            <Text style={styles.subtitle}>Swaps the mock rider/orders instantly - no reload needed.</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {MOCK_SCENARIOS.map((scenario) => {
                const active = scenario === current;
                return (
                  <TouchableOpacity
                    key={scenario}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => handlePick(scenario)}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>
                      {MOCK_SCENARIO_LABELS[scenario]}
                    </Text>
                    {active && <Text style={styles.rowCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
    marginBottom: 12,
  },
  list: {
    maxHeight: 420,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  rowActive: {
    backgroundColor: '#F3E8FF',
  },
  rowText: {
    fontSize: 13,
    color: '#000',
    flexShrink: 1,
  },
  rowTextActive: {
    fontWeight: '700',
  },
  rowCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
    marginLeft: 8,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
  },
});
