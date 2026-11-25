// Design tokens for the Profile sub-screens (Personal Information, Notifications, Help &
// Support, Rate GasApp, Terms & Privacy). Values are copied from the customer app so both
// apps look the same. Change a colour here, not in a screen.

export const colors = {
  // Avatars, switches, profile accents.
  primary: '#0A6CFF',
  // Filled buttons (PrimaryButton).
  button: '#007AFF',
  buttonDisabled: '#A0A0A0',
  danger: '#D92D20',
  success: '#22C55E',
  // Help & Support accent (links, step numbers, agent icon).
  support: '#0B8457',
  star: '#FF9500',
  // Selected rating tag.
  tagOn: '#0B5D3B',

  text: '#000',
  heading: '#111',
  textSecondary: 'rgba(0,0,0,0.55)',
  textMuted: 'rgba(0,0,0,0.45)',
  placeholder: 'rgba(0,0,0,0.35)',
  caret: 'rgba(0,0,0,0.4)',

  background: '#fff',
  // Grey page behind the white Support cards.
  backgroundGrouped: '#EDEEEE',
  // Big grey tiles (Support actions, segmented control).
  tile: '#F1F2F2',
  // Section headers, sheet footers, inner cards.
  surface: '#FAFAFA',
  closeButton: '#F2F2F2',
  switchOff: '#E5E5EA',

  divider: 'rgba(0,0,0,0.08)',
  hairline: 'rgba(0,0,0,0.12)',
  border: 'rgba(0,0,0,0.1)',
  warningBg: 'rgba(245,165,36,0.12)',
} as const;

// The round coloured dots on Profile and Notification rows. Kept the same as the customer
// app so riders and customers recognise the same items.
export const rowColors = {
  personalInfo: '#8E2DA8',
  privacy: '#2F3DE0',
  notification: '#F08A00',
  support: '#12A150',
  rateApp: '#E6B000',
  terms: '#0E8C9C',
} as const;
