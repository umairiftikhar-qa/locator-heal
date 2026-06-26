import type { Locator, Page } from '@playwright/test';
import { DEFAULT_OPTIONS } from './defaults';
import type {
  HealingLocator,
  HealerOptions,
  HealReport,
  LocatorBuilder,
  HealerInternalOptions,
  HealAttempt,
  HealAttemptAccepted
} from './types';
import { HealingLocatorImpl } from './healing-locator';
import { HealerEngine } from './healer-engine';
import { logHeal, printSummary } from './reporter/console';
import { writeJsonReport } from './reporter/json';

export class Healer implements LocatorBuilder {
  private page: Page;
  private options: HealerInternalOptions;
  private events: HealReport = { events: [] };
  private engine: HealerEngine;

  constructor(page: Page, options?: HealerOptions) {
    this.page = page;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.engine = new HealerEngine(page, this.options);
  }

  getByTestId(testId: string): HealingLocator {
    return new HealingLocatorImpl(this.page.getByTestId(testId), 'getByTestId', [testId], this);
  }

  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): HealingLocator {
    return new HealingLocatorImpl(this.page.getByRole(role, options), 'getByRole', [role, options], this);
  }

  getByText(text: string, options?: Parameters<Page['getByText']>[1]): HealingLocator {
    return new HealingLocatorImpl(this.page.getByText(text, options), 'getByText', [text, options], this);
  }

  getByLabel(text: string, options?: Parameters<Page['getByLabel']>[1]): HealingLocator {
    return new HealingLocatorImpl(this.page.getByLabel(text, options), 'getByLabel', [text, options], this);
  }

  getByPlaceholder(text: string, options?: Parameters<Page['getByPlaceholder']>[1]): HealingLocator {
    return new HealingLocatorImpl(this.page.getByPlaceholder(text, options), 'getByPlaceholder', [text, options], this);
  }

  locator(selector: string): HealingLocator {
    return new HealingLocatorImpl(this.page.locator(selector), 'locator', [selector], this);
  }

  async captureFingerprint(builder: string, builderArgs: unknown[], elementHandle: import('@playwright/test').ElementHandle<Element>): Promise<void> {
    if (this.options.mode === 'off') {
      return;
    }

    const key = this.buildKey(builder, builderArgs);
    await this.engine.capture(key, builder, builderArgs, elementHandle);
  }

  async attemptHeal(builder: string, builderArgs: unknown[], originalLocator: Locator): Promise<HealAttempt> {
    const key = this.buildKey(builder, builderArgs);
    const fingerprint = this.engine.getFingerprint(key);
    if (!fingerprint) {
      return { accepted: false, reason: 'noFingerprint' };
    }

    const best = await this.engine.findBestCandidate(fingerprint);
    if (!best) {
      return { accepted: false, reason: 'noCandidates' };
    }

    if (best.score < this.options.confidenceThreshold) {
      return {
        accepted: false,
        reason: 'belowThreshold',
        bestHealedWith: best.healedWith,
        bestScore: best.score,
        breakdown: best.breakdown
      };
    }

    return {
      accepted: true,
      locator: best.locator,
      healedWith: best.healedWith,
      score: best.score,
      breakdown: best.breakdown
    };
  }

  async recordHeal(builder: string, builderArgs: unknown[], attempt: HealAttemptAccepted): Promise<void> {
    const key = this.buildKey(builder, builderArgs);
    const originalSelector = this.buildOriginalSelector(builder, builderArgs);
    this.addEvent({
      key,
      originalSelector,
      healedWith: attempt.healedWith,
      score: attempt.score,
      signalBreakdown: attempt.breakdown,
      timestamp: new Date().toISOString()
    });

    const elementHandle = await attempt.locator.elementHandle();
    if (elementHandle) {
      await this.captureFingerprint(builder, builderArgs, elementHandle);
    }
  }

  private buildKey(builder: string, builderArgs: unknown[]): string {
    return `${builder}:${JSON.stringify(builderArgs)}`;
  }

  private buildOriginalSelector(builder: string, builderArgs: unknown[]): string {
    const args = builderArgs.map((arg) => JSON.stringify(arg)).join(', ');
    return `${builder}(${args})`;
  }

  async flush(): Promise<void> {
    await this.engine.flush();

    if (this.options.reporter === 'console') {
      printSummary(this.events.events);
    }

    if (this.options.reporter === 'json') {
      writeJsonReport(this.events);
    }
  }

  report(): HealReport {
    return this.events;
  }

  addEvent(event: any): void {
    this.events.events.push(event);
    if (this.options.reporter === 'console') {
      logHeal(event);
    }
    if (typeof this.options.onHeal === 'function') {
      this.options.onHeal(event);
    }
  }

  getOptions(): HealerInternalOptions {
    return this.options;
  }
}

export function createHealer(page: Page, options?: HealerOptions): Healer {
  return new Healer(page, options);
}
