import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WarningDuotoneIcon } from './icons/OrderCardIcons';
import ModalCloseButton from './ModalCloseButton';
import { OrderIssueReason } from '../types/order';

export const ORDER_ISSUE_REASON_LABELS: Record<OrderIssueReason, string> = {
  wrong_size: 'Customer selected the wrong cylinder size',
  wrong_pickup: 'Wrong pickup location',
  station_closed: 'Filling station is closed',
  no_lpg: 'No LPG available at the station',
  other: 'Something else',
};

const REASONS: OrderIssueReason[] = ['wrong_size', 'wrong_pickup', 'station_closed', 'no_lpg', 'other'];

interface ReportOrderIssueModalProps {
  visible: boolean;
  customerName: string;
  onCancel: () => void;
  onSubmit: (reasons: OrderIssueReason[], description?: string) => void;
}

export default function ReportOrderIssueModal({
  visible,
  customerName,
  onCancel,
  onSubmit,
}: ReportOrderIssueModalProps) {
  const [reasons, setReasons] = useState<OrderIssueReason[]>([]);
  const [description, setDescription] = useState('');

  const requiresDescription = reasons.includes('other');
  const canSubmit = reasons.length > 0 && (!requiresDescription || description.trim().length > 0);

  const toggleReason = (value: OrderIssueReason) => {
    setReasons((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));
  };

  const reset = () => {
    setReasons([]);
    setDescription('');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(reasons, description.trim() || undefined);
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ModalCloseButton onPress={handleCancel} />
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <WarningDuotoneIcon />
            <View style={styles.titleTextGroup}>
              <Text style={styles.title}>Report an Issue</Text>
              <Text style={styles.subtitle}>
                Select everything that applies. Support and {customerName} will be told about the
                problem. {customerName} is asked to contact support.
              </Text>
            </View>
          </View>

          <View style={styles.reasonList}>
            {REASONS.map((value) => {
              const selected = reasons.includes(value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                  onPress={() => toggleReason(value)}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <View style={styles.checkboxTick} />}
                  </View>
                  <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                    {ORDER_ISSUE_REASON_LABELS[value]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.descriptionGroup}>
            <Text style={styles.descriptionLabel}>
              Description {requiresDescription ? '' : '(optional)'}
            </Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add any extra details for the customer..."
              placeholderTextColor="rgba(0,0,0,0.35)"
              multiline
              maxLength={500}
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.submitText}>Send to Customer</Text>
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
    borderRadius: 24,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: 'rgba(12,12,13,0.1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 49,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#F4F4F4',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleTextGroup: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
  },
  reasonList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FAFAFA',
  },
  reasonRowSelected: {
    borderColor: '#F79009',
    backgroundColor: '#FFFAEB',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#F79009',
    backgroundColor: '#F79009',
  },
  checkboxTick: {
    width: 8,
    height: 5,
    marginTop: -1,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  reasonLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
  },
  reasonLabelSelected: {
    color: '#000',
    fontWeight: '500',
  },
  descriptionGroup: {
    gap: 8,
  },
  descriptionLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    fontSize: 13,
    color: '#000',
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  submitButton: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
