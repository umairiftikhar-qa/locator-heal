import type { ElementHandle, Locator, Page } from '@playwright/test';

export type ReporterType = 'console' | 'json' | 'none';

export type HealerMode = 'heal' | 'record-only' | 'off';

export interface HealerOptions {
  store?: string;
  confidenceThreshold?: number;
  mode?: HealerMode;
  onHeal?: (event: HealEvent) => void;
  reporter?: ReporterType;
}

export interface HealEvent {
  key: string;
  originalSelector: string;
  healedWith: string;
  score: number;
  signalBreakdown: Record<string, number>;
  timestamp: string;
  testTitle?: string;
}

export interface HealReport {
  events: HealEvent[];
}

export type HealingAction =
  | 'click'
  | 'fill'
  | 'type'
  | 'press'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'selectOption'
  | 'textContent'
  | 'innerText'
  | 'inputValue'
  | 'isVisible'
  | 'isEnabled'
  | 'getAttribute'
  | 'waitFor';

export interface LocatorBuilder {
  getByTestId(testId: string): HealingLocator;
  getByRole(role: string, options?: Parameters<Page['getByRole']>[1]): HealingLocator;
  getByText(text: string, options?: Parameters<Page['getByText']>[1]): HealingLocator;
  getByLabel(text: string, options?: Parameters<Page['getByLabel']>[1]): HealingLocator;
  getByPlaceholder(text: string, options?: Parameters<Page['getByPlaceholder']>[1]): HealingLocator;
  locator(selector: string): HealingLocator;
}

export interface HealingLocator {
  click(options?: Parameters<Locator['click']>[0]): Promise<void>;
  fill(value: string, options?: Parameters<Locator['fill']>[0]): Promise<void>;
  type(text: string, options?: Parameters<Locator['type']>[0]): Promise<void>;
  press(key: string, options?: Parameters<Locator['press']>[0]): Promise<void>;
  check(options?: Parameters<Locator['check']>[0]): Promise<void>;
  uncheck(options?: Parameters<Locator['uncheck']>[0]): Promise<void>;
  hover(options?: Parameters<Locator['hover']>[0]): Promise<void>;
  selectOption(value: string | { value: string } | Array<string | { value: string }>, options?: Parameters<Locator['selectOption']>[1]): Promise<void>;
  textContent(options?: Parameters<Locator['textContent']>[0]): Promise<string | null>;
  innerText(options?: Parameters<Locator['innerText']>[0]): Promise<string>;
  inputValue(options?: Parameters<Locator['inputValue']>[0]): Promise<string>;
  isVisible(options?: Parameters<Locator['isVisible']>[0]): Promise<boolean>;
  isEnabled(options?: Parameters<Locator['isEnabled']>[0]): Promise<boolean>;
  getAttribute(name: string): Promise<string | null>;
  waitFor(options?: Parameters<Locator['waitFor']>[0]): Promise<void>;
}

export interface HealAttemptAccepted {
  accepted: true;
  locator: Locator;
  healedWith: string;
  score: number;
  breakdown: Record<string, number>;
}

export interface HealAttemptRejected {
  accepted: false;
  reason: 'noFingerprint' | 'noCandidates' | 'belowThreshold';
  bestHealedWith?: string;
  bestScore?: number;
  breakdown?: Record<string, number>;
}

export type HealAttempt = HealAttemptAccepted | HealAttemptRejected;

export interface HealerBridge {
  getOptions(): HealerInternalOptions;
  captureFingerprint(builder: string, builderArgs: unknown[], elementHandle: ElementHandle): Promise<void>;
  attemptHeal(builder: string, builderArgs: unknown[], originalLocator: Locator): Promise<HealAttempt>;
  recordHeal(builder: string, builderArgs: unknown[], attempt: HealAttemptAccepted): Promise<void>;
  addEvent(event: HealEvent): void;
}

export interface HealerInternalOptions extends HealerOptions {
  store: string;
  confidenceThreshold: number;
  mode: HealerMode;
  reporter: ReporterType;
}
