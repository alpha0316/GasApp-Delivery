import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'phosphor-react-native';

interface ModalCloseButtonProps {
  onPress: () => void;
}

export default function ModalCloseButton({ onPress }: ModalCloseButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <X size={16} color="rgba(0,0,0,0.6)" weight="bold" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
