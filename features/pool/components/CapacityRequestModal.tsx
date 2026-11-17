import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ModalCloseButton from '../../../components/ModalCloseButton';
import { errorMessage } from '../../../lib/api/client';
import { useRequestCapacity } from '../hooks';

const MIN_LIMIT = 2;
const MAX_LIMIT = 50;

interface CapacityRequestModalProps {
  visible: boolean;
  currentLimit: number;
  onClose: () => void;
}

export default function CapacityRequestModal({ visible, currentLimit, onClose }: CapacityRequestModalProps) {
  const request = useRequestCapacity();
  const [limit, setLimit] = useState('');
  const [reason, setReason] = useState('');

  const requestedLimit = Number.parseInt(limit, 10);
  const valid = Number.isInteger(requestedLimit) && requestedLimit >= MIN_LIMIT && requestedLimit <= MAX_LIMIT && requestedLimit > currentLimit;

  const handleClose = () => {
    setLimit('');
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!valid) return;
    try {
      await request.mutateAsync({ requestedLimit, reason: reason.trim() || undefined });
      Alert.alert('Request sent', 'An admin will review your request.');
      handleClose();
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <ModalCloseButton onPress={handleClose} />
          <Text style={styles.title}>Request a higher order limit</Text>
          <Text style={styles.subtitle}>Your current limit is {currentLimit} orders at a time.</Text>

          <Text style={styles.label}>New limit ({MIN_LIMIT}-{MAX_LIMIT})</Text>
          <TextInput
            style={styles.input}
            value={limit}
            onChangeText={setLimit}
            keyboardType="numeric"
            maxLength={2}
            accessibilityLabel="New limit"
          />

          <Text style={styles.label}>Reason (optional)</Text>
          <TextInput
            style={[styles.input, styles.reasonInput]}
            value={reason}
            onChangeText={setReason}
            multiline
            accessibilityLabel="Reason"
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!valid || request.isPending) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!valid || request.isPending}
            >
              <Text style={styles.submitText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    paddingRight: 32,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
  },
  label: {
    fontSize: 14,
    marginTop: 6,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
  },
  reasonInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
