import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FloatingSheet, { SheetButton } from './FloatingSheet';
import OrderRequestCard, { useOfferCountdown } from './OrderRequestCard';
import { FlagIcon } from './icons/OrderCardIcons';
import { Order } from '../types/order';

interface NewOrderRequestModalProps {
  visible: boolean;
  order: Order | null;
  offerExpiresAt: string;
  onAccept: () => void;
  onDecline: () => void;
  // Closing the sheet (backdrop tap, or Android back) just hides it - the
  // offer stays live in the background so the rider can reconsider rather
  // than it being gone outright.
  onDismiss: () => void;
  onFlag?: () => void;
  busy?: boolean;
  acceptDisabled?: boolean;
  onTopUp?: () => void;
  // Copy overrides, e.g. mid-delivery: "Add to Run" / "Refer to Riders".
  subtitle?: string;
  acceptLabel?: string;
  declineLabel?: string;
}

export default function NewOrderRequestModal({ visible, order, ...rest }: NewOrderRequestModalProps) {
  // Mount the sheet only while it's shown, so the auto-decline countdown runs
  // only while the rider can see the offer (as before), and the sheet's
  // entrance animation plays each time it opens.
  if (!visible || !order) return null;
  return <OrderRequestSheet order={order} {...rest} />;
}

function OrderRequestSheet({
  order,
  offerExpiresAt,
  onAccept,
  onDecline,
  onDismiss,
  onFlag,
  busy = false,
  acceptDisabled = false,
  onTopUp,
  subtitle = 'You can queue this for after your current delivery or decline it.',
  acceptLabel = 'Accept',
  declineLabel = 'Decline',
}: Omit<NewOrderRequestModalProps, 'visible' | 'order'> & { order: Order }) {
  const secondsLeft = useOfferCountdown(offerExpiresAt, onDecline);
  // Lock the buttons as soon as the window closes, without waiting for the
  // decline request and pool refetch, so a late tap can't land.
  const disabled = busy || secondsLeft <= 0;

  // `busy` only disables the buttons on the next render, so a quick double
  // tap could still send a second accept - which fails with "no longer
  // available" because the first one already took the order. This lock is
  // set synchronously on the first tap and released once the request ends
  // (busy goes back to false), so a refusal like a low wallet can be retried.
  const locked = useRef(false);
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy) locked.current = false;
    wasBusy.current = busy;
  }, [busy]);
  const once = (action: () => void) => () => {
    if (locked.current) return;
    locked.current = true;
    action();
  };

  return (
    <FloatingSheet
      visible
      alert
      onClose={onDismiss}
      footer={
        <>
          {onFlag && (
            <TouchableOpacity
              style={styles.flagButton}
              onPress={onFlag}
              accessibilityRole="button"
              accessibilityLabel="Report an issue with this order"
            >
              <FlagIcon />
            </TouchableOpacity>
          )}
          <SheetButton title={declineLabel} variant="destructive" onPress={once(onDecline)} disabled={disabled} />
          {acceptDisabled && onTopUp ? (
            <SheetButton title="Top up wallet" variant="primary" onPress={onTopUp} />
          ) : (
            <SheetButton title={acceptLabel} variant="success" onPress={once(onAccept)} disabled={disabled} />
          )}
        </>
      }
    >
      <View style={styles.titleGroup}>
        <Text style={styles.title}>New Order Request</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.cardWrap}>
        <OrderRequestCard
          order={order}
          offerExpiresAt={offerExpiresAt}
          secondsLeft={secondsLeft}
          onAccept={onAccept}
          onDecline={onDecline}
          showActions={false}
          busy={busy}
          acceptDisabled={acceptDisabled}
        />
      </View>
    </FloatingSheet>
  );
}

const styles = StyleSheet.create({
  titleGroup: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  cardWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  flagButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
