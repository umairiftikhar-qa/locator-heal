import type { Locator } from '@playwright/test';
import type { HealAttempt, HealingLocator, HealerBridge } from './types';

export class HealingLocatorImpl implements HealingLocator {
  constructor(
    private readonly locator: Locator,
    private readonly builder: string,
    private readonly builderArgs: unknown[],
    private readonly healer: HealerBridge,
  ) {}

  click(options?: Parameters<Locator['click']>[0]): Promise<void> {
    return this.perform((locator) => locator.click({ timeout: 5000, ...(options ?? {}) }));
  }

  fill(value: string, options?: Parameters<Locator['fill']>[0]): Promise<void> {
    return this.perform((locator) => locator.fill(value, { timeout: 5000, ...(options ?? {}) }));
  }

  type(text: string, options?: Parameters<Locator['type']>[0]): Promise<void> {
    return this.perform((locator) => locator.type(text, { timeout: 5000, ...(options ?? {}) }));
  }

  press(key: string, options?: Parameters<Locator['press']>[0]): Promise<void> {
    return this.perform((locator) => locator.press(key, { timeout: 5000, ...(options ?? {}) }));
  }

  check(options?: Parameters<Locator['check']>[0]): Promise<void> {
    return this.perform((locator) => locator.check({ timeout: 5000, ...(options ?? {}) }));
  }

  uncheck(options?: Parameters<Locator['uncheck']>[0]): Promise<void> {
    return this.perform((locator) => locator.uncheck({ timeout: 5000, ...(options ?? {}) }));
  }

  hover(options?: Parameters<Locator['hover']>[0]): Promise<void> {
    return this.perform((locator) => locator.hover({ timeout: 5000, ...(options ?? {}) }));
  }

  selectOption(
    value: string | { value: string } | Array<string | { value: string }>,
    options?: Parameters<Locator['selectOption']>[1],
  ): Promise<void> {
    return this.perform((locator) => locator.selectOption(value, { timeout: 5000, ...(options ?? {}) }));
  }

  textContent(options?: Parameters<Locator['textContent']>[0]): Promise<string | null> {
    return this.perform((locator) => locator.textContent({ timeout: 5000, ...(options ?? {}) }));
  }

  innerText(options?: Parameters<Locator['innerText']>[0]): Promise<string> {
    return this.perform((locator) => locator.innerText({ timeout: 5000, ...(options ?? {}) }));
  }

  inputValue(options?: Parameters<Locator['inputValue']>[0]): Promise<string> {
    return this.perform((locator) => locator.inputValue({ timeout: 5000, ...(options ?? {}) }));
  }

  isVisible(options?: Parameters<Locator['isVisible']>[0]): Promise<boolean> {
    return this.perform((locator) => locator.isVisible({ timeout: 5000, ...(options ?? {}) }));
  }

  isEnabled(options?: Parameters<Locator['isEnabled']>[0]): Promise<boolean> {
    return this.perform((locator) => locator.isEnabled({ timeout: 5000, ...(options ?? {}) }));
  }

  getAttribute(name: string): Promise<string | null> {
    return this.perform((locator) => locator.getAttribute(name));
  }

  waitFor(options?: Parameters<Locator['waitFor']>[0]): Promise<void> {
    return this.perform((locator) => locator.waitFor({ timeout: 5000, ...(options ?? {}) }));
  }

  private async perform<T>(fn: (locator: Locator) => Promise<T>): Promise<T> {
    if (this.healer.getOptions().mode === 'off') {
      return fn(this.locator);
    }

    try {
      const result = await fn(this.locator);
      await this.captureIfRecording();
      return result;
    } catch (error) {
      if (this.healer.getOptions().mode !== 'heal') {
        throw error;
      }

      const attempt = await this.healer.attemptHeal(this.builder, this.builderArgs, this.locator);
      if (!attempt.accepted) {
        if (error instanceof Error && attempt.bestHealedWith && typeof attempt.bestScore === 'number') {
          error.message += `\nLocatorHeal: best candidate ${attempt.bestHealedWith} score=${attempt.bestScore.toFixed(2)}`;
        }
        throw error;
      }

      const result = await fn(attempt.locator);
      await this.healer.recordHeal(this.builder, this.builderArgs, attempt);
      return result;
    }
  }

  private async captureIfRecording(): Promise<void> {
    if (this.healer.getOptions().mode !== 'record-only') {
      return;
    }

    const elementHandle = await this.locator.elementHandle();
    if (!elementHandle) {
      return;
    }

    await this.healer.captureFingerprint(this.builder, this.builderArgs, elementHandle);
  }
}
