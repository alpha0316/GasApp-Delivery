import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WarningDuotoneIcon } from './icons/OrderCardIcons';
import { CANCEL_REASONS, isValidCancelReason, type CancelReason } from '../lib/orders/cancelReasons';

interface CancelOrderModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (reason: CancelReason) => void;
}

export default function CancelOrderModal({ visible, onCancel, onSubmit }: CancelOrderModalProps) {
  const [reason, setReason] = useState<CancelReason | null>(null);

  const reset = () => setReason(null);

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason);
    reset();
  };

  const willStrike = reason !== null && !isValidCancelReason(reason);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <WarningDuotoneIcon />
            <View style={styles.titleTextGroup}>
              <Text style={styles.title}>Cancel this order?</Text>
              <Text style={styles.subtitle}>
                Only possible before you pick up the cylinder. Tell us why so we can restart the search for another rider.
              </Text>
            </View>
          </View>

          <View style={styles.reasonList}>
            {CANCEL_REASONS.map(({ value, label }) => {
              const selected = reason === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                  onPress={() => setReason(value)}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {willStrike && (
            <Text style={styles.strikeWarning}>
              This reason records a cancellation strike. 3 within 7 days suspends your account pending review.
            </Text>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Keep order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, !reason && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!reason}
            >
              <Text style={styles.submitText}>Cancel order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#F79009',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F79009',
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
  strikeWarning: {
    fontSize: 12,
    color: '#B42318',
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
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B42318',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(180,35,24,0.35)',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
