export const SIGNAL_WEIGHTS = {
  testId: 0.3,
  id: 0.2,
  role: 0.12,
  ariaLabel: 0.1,
  text: 0.12,
  labelText: 0.06,
  name: 0.04,
  placeholder: 0.03,
  tag: 0.01,
  classList: 0.01,
  domPath: 0.005,
  siblingIndex: 0.005,
  boundingBox: 0.005
} as const;

export type SignalKey = keyof typeof SIGNAL_WEIGHTS;
