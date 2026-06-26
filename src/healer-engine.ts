import type { ElementHandle, Locator, Page } from '@playwright/test';
import type { Fingerprint } from './fingerprint/schema';
import { getFingerprint, loadStore, putFingerprint, saveStore, FingerprintStore } from './fingerprint/store';
import { scoreFingerprint } from './scoring/score';
import type { HealerInternalOptions } from './types';

interface CandidateSignals extends Partial<Fingerprint> {
  tag: string;
  classList: string[];
  attributes: Record<string, string>;
  domPath: string;
  siblingIndex: number;
}

interface CandidateMatch {
  candidate: CandidateSignals;
  score: number;
  breakdown: Record<string, number>;
  healedWith: string;
  locator: Locator;
}

const MAX_CANDIDATES = 200;

export class HealerEngine {
  private store: FingerprintStore;
  private dirty = false;

  constructor(private page: Page, private options: HealerInternalOptions) {
    this.store = loadStore(options.store);
  }

  getFingerprint(key: string): Fingerprint | undefined {
    return getFingerprint(this.store, key);
  }

  async capture(key: string, builder: string, builderArgs: unknown[], elementHandle: ElementHandle<Element>): Promise<void> {
    const fingerprint = await this.extractFingerprintFromHandle(elementHandle, key, builder, builderArgs);
    putFingerprint(this.store, fingerprint);
    this.dirty = true;
  }

  async findBestCandidate(fingerprint: Fingerprint): Promise<CandidateMatch | undefined> {
    const candidates = await this.collectCandidates(fingerprint);
    if (candidates.length === 0) {
      return undefined;
    }

    const matches = candidates.map((candidate) => {
      const { score, breakdown } = scoreFingerprint(fingerprint, candidate);
      return {
        candidate,
        score,
        breakdown,
        healedWith: this.buildHealedWith(candidate),
        locator: this.buildLocatorForCandidate(candidate)
      };
    });

    matches.sort((a, b) => b.score - a.score);
    return matches[0];
  }

  async flush(): Promise<void> {
    if (!this.dirty) {
      return;
    }
    saveStore(this.options.store, this.store);
    this.dirty = false;
  }

  private async collectCandidates(fingerprint: Fingerprint): Promise<CandidateSignals[]> {
    const selectors: string[] = [];
    if (fingerprint.role) {
      selectors.push(`${fingerprint.tag || '*'}[role="${fingerprint.role}"]`);
      selectors.push(`[role="${fingerprint.role}"]`);
    }
    if (fingerprint.tag) {
      selectors.push(fingerprint.tag);
    }
    selectors.push('*');

    for (const selector of selectors) {
      const locator = this.page.locator(selector);
      const count = await locator.count();
      if (count === 0) {
        continue;
      }

      const candidates: CandidateSignals[] = [];
      for (let i = 0; i < Math.min(count, MAX_CANDIDATES); i += 1) {
        const handle = await locator.nth(i).elementHandle();
        if (!handle) {
          continue;
        }
        candidates.push(await this.extractElementSignals(handle));
      }

      if (candidates.length > 0) {
        return candidates;
      }
    }

    return [];
  }

  private async extractFingerprintFromHandle(
    handle: ElementHandle<Element>,
    key: string,
    builder: string,
    builderArgs: unknown[],
  ): Promise<Fingerprint> {
    return handle.evaluate(
      (element, details) => {
        const normalizeText = (value: string | null | undefined): string | undefined => {
          if (value === null || value === undefined) {
            return undefined;
          }
          const normalized = value.replace(/\s+/g, ' ').trim().slice(0, 200);
          return normalized.length === 0 ? undefined : normalized;
        };

        const buildDomPath = (node: Element): string => {
          const parts: string[] = [];
          let current: Element | null = node;
          while (current) {
            let part = current.tagName.toLowerCase();
            if (current.id) {
              part += `#${current.id}`;
            } else if (current.classList.length > 0) {
              part += `.${Array.from(current.classList).join('.')}`;
            }
            parts.unshift(part);
            current = current.parentElement;
          }
          return parts.join(' > ');
        };

        const calculateSiblingIndex = (node: Element): number => {
          if (!node.parentElement) {
            return 0;
          }
          return Array.from(node.parentElement.children).indexOf(node);
        };

        const findLabelText = (node: Element): string | undefined => {
          const id = node.id;
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) {
              return label.textContent?.trim() || undefined;
            }
          }
          let parent: Element | null = node.parentElement;
          while (parent) {
            if (parent.tagName.toLowerCase() === 'label') {
              return parent.textContent?.trim() || undefined;
            }
            parent = parent.parentElement;
          }
          return undefined;
        };

        const attributes: Record<string, string> = {};
        for (const attr of Array.from(element.attributes || [])) {
          if (attr.name === 'class' || attr.name === 'id') {
            continue;
          }
          attributes[attr.name] = attr.value;
        }

        const classList = Array.from(element.classList || []);
        const boundingBox = element.getBoundingClientRect();
        const domPath = buildDomPath(element);

        return {
          key: details.key,
          builder: details.builder,
          builderArgs: details.builderArgs,
          testId: element.getAttribute('data-testid') || undefined,
          id: element.id || undefined,
          role: element.getAttribute('role') || undefined,
          ariaLabel: normalizeText(element.getAttribute('aria-label')),
          text: normalizeText(element.textContent),
          labelText: normalizeText(findLabelText(element)),
          name: normalizeText((element as HTMLInputElement).name || null),
          placeholder: normalizeText((element as HTMLInputElement).placeholder || null),
          tag: element.tagName.toLowerCase(),
          classList,
          attributes,
          domPath,
          siblingIndex: calculateSiblingIndex(element),
          boundingBox:
            Number.isFinite(boundingBox.width) && Number.isFinite(boundingBox.height)
              ? {
                  x: boundingBox.x,
                  y: boundingBox.y,
                  w: boundingBox.width,
                  h: boundingBox.height
                }
              : undefined,
          updatedAt: new Date().toISOString()
        };
      },
      { key, builder, builderArgs },
    );
  }

  private async extractElementSignals(handle: ElementHandle<Element>): Promise<CandidateSignals> {
    return handle.evaluate((element) => {
      const normalizeText = (value: string | null | undefined): string | undefined => {
        if (value === null || value === undefined) {
          return undefined;
        }
        const normalized = value.replace(/\s+/g, ' ').trim().slice(0, 200);
        return normalized.length === 0 ? undefined : normalized;
      };

      const buildDomPath = (node: Element): string => {
        const parts: string[] = [];
        let current: Element | null = node;
        while (current) {
          let part = current.tagName.toLowerCase();
          if (current.id) {
            part += `#${current.id}`;
          } else if (current.classList.length > 0) {
            part += `.${Array.from(current.classList).join('.')}`;
          }
          parts.unshift(part);
          current = current.parentElement;
        }
        return parts.join(' > ');
      };

      const calculateSiblingIndex = (node: Element): number => {
        if (!node.parentElement) {
          return 0;
        }
        return Array.from(node.parentElement.children).indexOf(node);
      };

      const findLabelText = (node: Element): string | undefined => {
        const id = node.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            return label.textContent?.trim() || undefined;
          }
        }
        let parent: Element | null = node.parentElement;
        while (parent) {
          if (parent.tagName.toLowerCase() === 'label') {
            return parent.textContent?.trim() || undefined;
          }
          parent = parent.parentElement;
        }
        return undefined;
      };

      const attributes: Record<string, string> = {};
      for (const attr of Array.from(element.attributes || [])) {
        if (attr.name === 'class' || attr.name === 'id') {
          continue;
        }
        attributes[attr.name] = attr.value;
      }

      const classList = Array.from(element.classList || []);
      const boundingBox = element.getBoundingClientRect();
      const domPath = buildDomPath(element);

      return {
        testId: element.getAttribute('data-testid') || undefined,
        id: element.id || undefined,
        role: element.getAttribute('role') || undefined,
        ariaLabel: normalizeText(element.getAttribute('aria-label')),
        text: normalizeText(element.textContent),
        labelText: normalizeText(findLabelText(element)),
        name: normalizeText((element as HTMLInputElement).name || null),
        placeholder: normalizeText((element as HTMLInputElement).placeholder || null),
        tag: element.tagName.toLowerCase(),
        classList,
        attributes,
        domPath,
        siblingIndex: calculateSiblingIndex(element),
        boundingBox:
          Number.isFinite(boundingBox.width) && Number.isFinite(boundingBox.height)
            ? {
                x: boundingBox.x,
                y: boundingBox.y,
                w: boundingBox.width,
                h: boundingBox.height
              }
            : undefined
      };
    });
  }

  private buildLocatorForCandidate(candidate: CandidateSignals): Locator {
    if (candidate.testId) {
      return this.page.getByTestId(candidate.testId);
    }
    if (candidate.id) {
      return this.page.locator(`[id=${JSON.stringify(candidate.id)}]`);
    }
    if (candidate.role && candidate.text) {
      return this.page.getByRole(candidate.role, { name: candidate.text });
    }
    if (candidate.role) {
      return this.page.getByRole(candidate.role);
    }
    if (candidate.text) {
      return this.page.getByText(candidate.text);
    }
    if (candidate.ariaLabel) {
      return this.page.getByLabel(candidate.ariaLabel);
    }
    return this.page.locator(candidate.domPath || '*');
  }

  private buildHealedWith(candidate: CandidateSignals): string {
    if (candidate.testId) {
      return `getByTestId(${JSON.stringify(candidate.testId)})`;
    }
    if (candidate.id) {
      return `#${candidate.id}`;
    }
    if (candidate.role && candidate.text) {
      return `getByRole(${JSON.stringify(candidate.role)}, { name: ${JSON.stringify(candidate.text)} })`;
    }
    if (candidate.role) {
      return `getByRole(${JSON.stringify(candidate.role)})`;
    }
    if (candidate.text) {
      return `getByText(${JSON.stringify(candidate.text)})`;
    }
    if (candidate.ariaLabel) {
      return `getByLabel(${JSON.stringify(candidate.ariaLabel)})`;
    }
    return `locator(${JSON.stringify(candidate.domPath || '*')})`;
  }
}
