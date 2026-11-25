import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Flask } from 'phosphor-react-native';
import { MOCK_API } from '../../lib/api/devMock';

// Shown on the sign-in screens of a mock (team test) build only, so testers
// know no real SMS is sent and how to reach the test scenarios.
export default function TestBuildNote({ text }: { text: string }) {
  if (!MOCK_API) return null;
  return (
    <View style={styles.note} accessibilityRole="text">
      <Flask size={16} color="#7C3AED" weight="fill" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    marginVertical: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: '#4C1D95',
    lineHeight: 18,
  },
});
